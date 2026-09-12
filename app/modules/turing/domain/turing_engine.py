# Vespera/app/modules/turing/domain/turing_engine.py

from __future__ import annotations

from io import BytesIO
from typing import Union
import base64
import numpy as np
from scipy.ndimage import convolve
from PIL import Image, ImageOps
from tqdm import tqdm

from app.core.config import TuringSettings, RNGSettings

class TuringEngine:
    """
    Simulador determinista de patrones de reacción-difusión
    utilizando el modelo no lineal de Gray-Scott en 2D.
    """

    # Kernel del Operador Laplaciano isotrópico discretizado a 9 puntos
    LAPLACIAN_KERNEL : np.ndarray = np.array([
        [0.05,  0.20, 0.05],
        [0.20, -1.00, 0.20],
        [0.05,  0.20, 0.05]
    ], dtype=np.float32)

    def __init__(
        self           : TuringEngine,
        feed_rate      : float = TuringSettings.DEFAULT_FEED_RATE,
        kill_rate      : float = TuringSettings.DEFAULT_KILL_RATE,
        diff_u         : float = TuringSettings.DEFAULT_DIFF_U,
        diff_v         : float = TuringSettings.DEFAULT_DIFF_V,
        dt             : float = TuringSettings.DEFAULT_DT,
        iterations     : int   = TuringSettings.DEFAULT_ITERATIONS,
        frame_count    : int   = TuringSettings.DEFAULT_FRAMES,
        frame_dist_exp : float = TuringSettings.DEFAULT_FRAME_DENSITY_EXP,
        color_palette  : str   = TuringSettings.DEFAULT_PALETTE,
        seed           : int   = RNGSettings.SEED,
        verbose        : bool  = False
    ) -> None:
        self.feed_rate      : float = float(feed_rate)
        self.kill_rate      : float = float(kill_rate)
        self.diff_u         : float = float(diff_u)
        self.diff_v         : float = float(diff_v)
        self.dt             : float = float(dt)
        self.iterations     : int   = int(iterations)
        self.frame_count    : int   = int(frame_count)
        self.frame_dist_exp : float = float(frame_dist_exp)
        self.color_palette  : str   = color_palette
        self.seed           : int   = int(seed)
        self.verbose        : bool  = verbose

    @staticmethod
    def _preprocess_luminance(
        image         : Image.Image,
        target_width  : int,
        target_height : int
    ) -> np.ndarray:
        """
        Convierte una imagen de un objeto PIL a un mapa de luminancia 2D normalizado [0.0, 1.0].
        :return : Matriz de NumPy tipo float32.
        """
        try:
            oriented_image : Image.Image = ImageOps.exif_transpose(image)


            grayscale  : Image.Image = oriented_image.convert("L").resize(
                (target_width, target_height),
                Image.Resampling.LANCZOS
            )
            lum_array : np.ndarray = np.asarray(grayscale, dtype=np.float32) / 255.0
            return lum_array
        except Exception as e:
            raise ValueError(f"Error al preprocesar la imagen: {e}")

    @staticmethod
    def _render_frame(
        v_matrix : np.ndarray,
        size     : int = 512
    ) -> tuple[Image.Image, str]:
        """
        Renderiza una matriz de concentración V a una imagen 512x512 en escala de grises y genera
        su cadena base64.
        :return : Tupla con la imagen PIL (modo L) y la cadena URL base64.
        """
        try:
            clamped_v  : np.ndarray  = np.clip(v_matrix, 0.0, 1.0)
            gray_array : np.ndarray  = (clamped_v*255.0).astype(np.uint8)
            frame_img  : Image.Image = Image.fromarray(gray_array, mode="L")

            if frame_img.size != (size, size):
                frame_img : Image.Image = frame_img.resize((size, size), Image.Resampling.BILINEAR)

            buffer : BytesIO = BytesIO()
            frame_img.save(buffer, format="JPEG", quality=85)
            encoded : str = base64.b64encode(buffer.getvalue()).decode("utf-8")

            return frame_img, f"data:image/jpeg;base64,{encoded}"

        except Exception as e:
            raise e

    def seed_concentrations(
        self            : TuringEngine,
        luminance_field : np.ndarray
    ) -> tuple[np.ndarray, np.ndarray]:
        """
        Inicializa las matrices de concentración U y V.
        Inyecta la topología de la imagen en la concentración inicial de V.
        :param luminance_field : Matriz normalizada de luminancia.
        :return                : Tupla de concentraciones iniciales (U, V)
        """
        try:
            height, width = luminance_field.shape

            # Generador pseudoaleatorio determinista usando una semilla fija
            rng : np.random.Generator = np.random.default_rng(seed=self.seed)

            # Inyección controlada de ruido
            noise : np.ndarray = rng.uniform(0.0, 0.08, size=(height, width)).astype(np.float32)

            # Modulación de V a partir de los contrastes de la imagen original
            v = (luminance_field*0.35 + noise).astype(np.float32)
            u = 1.0 - (luminance_field * 0.30).astype(np.float32)

            return np.clip(u, 0.0, 1.0), np.clip(v, 0.0, 1.0)
        except Exception as e:
            raise e

    def simulate(
        self             : TuringEngine,
        source_image     : Image.Image,
        width            : int = TuringSettings.DEFAULT_WIDTH,
        height           : int = TuringSettings.DEFAULT_HEIGHT,
        capture_timeline : bool = False
    ) -> tuple[np.ndarray, Image.Image, list[Image.Image], list[str], list[int]]:
        """
        Ejecuta la integración del sistema de ecuaciones diferenciales parciales paso a paso.
        :param source_image     : Objeto PIL con la imagen original.
        :param width            : Ancho de la cuadrícula de la simulación.
        :param height           : Alto de la cuadrícula de la simulación.
        :param capture_timeline : Indica si se deben capturar keyframes para animar el proceso.
        :return                 : Tupla con:
            - La matriz final V
            - La imagen final renderizada (PIL) modo L
            - Objetos PIL para los frames de la animación
            - Lista de strings base64 para los frames de la animación
            - Lista de iteraciones en las que se capturaron los frames
        """
        try:
            lum : np.ndarray = self._preprocess_luminance(source_image, width, height)
            u, v             = self.seed_concentrations(lum)

            # Variación espacial suave del feed rate F modulado por la luminancia.
            spatial_f : np.ndarray = self.feed_rate * (0.95 + (lum*0.10)).astype(np.float32)
            spatial_k : float      = self.kill_rate

            kernel : np.ndarray = self.LAPLACIAN_KERNEL
            dt     : float      = self.dt
            du     : float      = self.diff_u
            dv     : float      = self.diff_v

            frame_images   : list[Image.Image] = []
            keyframes_b64  : list[str]         = []
            captured_iters : list[int]         = []
            capture_steps  : set[int]          = set()

            # Ley de potencias con parámetro > 1 para capturar más frames al inicio donde se nota más el cambio
            if capture_timeline and self.frame_count > 1:
                raw_steps     : np.ndarray = np.linspace(0.0, 1.0, self.frame_count) ** self.frame_dist_exp
                capture_steps : set[int]   = {int(s*(self.iterations-1)) for s in raw_steps}
                capture_steps.add(0)
                capture_steps.add(self.iterations-1)

            # Integración determinista usando Euler explicito con condiciones de frontera periódicas wrap.
            for step in tqdm(range(self.iterations), desc="Integrating Gray-Scott Equations"):
                if capture_timeline and step in capture_steps:
                    frame_pil, frame_b64 = self._render_frame(v)
                    frame_images.append(frame_pil)
                    keyframes_b64.append(frame_b64)
                    captured_iters.append(step)

                # Evaluar Laplaciano usando convolución discreta
                lap_u : np.ndarray = convolve(u, kernel, mode="wrap")
                lap_v : np.ndarray = convolve(v, kernel, mode="wrap")

                uvv : np.ndarray = u*v*v

                # Ecuaciones de Reacción-Difusión de Gray-Scott
                u += (du*lap_u - uvv + spatial_f*(1.0-u))*dt
                v += (dv*lap_v + uvv - (spatial_f+spatial_k)*v)*dt

                # Condiciones de frontera
                np.clip(u, 0.0, 1.0, out=u)
                np.clip(v, 0.0, 1.0, out=v)

            # Renderización usando la paleta de colores seleccionada
            final_array : np.ndarray  = (np.clip(v, 0.0, 1.0)*255.0).astype(np.uint8)
            final_image : Image.Image = Image.fromarray(final_array, mode="L").convert("RGB")

            return v, final_image, frame_images, keyframes_b64, captured_iters

        except Exception as e:
            raise e
