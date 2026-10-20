# Vespera/app/modules/spectra/domain/palette_interpolation.py

from __future__ import annotations

from typing import Any
import numpy as np

class PaletteInterpolationModel:
    """
    Modelo de interpolación lineal para paletas de colores a partir de puntos de control.
    """

    @staticmethod
    def interpolate_palette(stops : list[dict[str, Any]]) -> np.ndarray:
        """
        Construye o recupera del caché una LUT de 256x3 (RGB uint8).
        :param stops : Lista de diccionarios con los puntos de control de la paleta con las siguientes keys:
            - stop_position : Punto de control entre 0 y 1.
            - r, g, b       : Valores de los colores entre 0 y 255.
        :return      : Arreglo NumPy 256x3 tipo uint8.
        """
        if not stops: raise ValueError("No palette stops were provided.")

        positions     : np.ndarray = np.array([s["stop_position"]       for s in stops], dtype=np.float64)
        colors        : np.ndarray = np.array([[s["r"], s["g"], s["b"]] for s in stops], dtype=np.float64)

        if len(stops) == 1: return np.tile(colors[0], (256, 1)).astype(np.uint8)

        sample_points : np.ndarray = np.clip(np.arange(256, dtype=np.float64) / 255.0, positions[0], positions[-1])
        lower_idx     : np.ndarray = np.minimum(np.searchsorted(positions[1:], sample_points, side="left"), len(stops) - 2)
        lower_pos     : np.ndarray = positions[lower_idx]
        span          : np.ndarray = positions[lower_idx + 1] - lower_pos
        factor        : np.ndarray = np.divide(sample_points - lower_pos, span, out=np.zeros_like(span), where=(span > 0))
        lower_rgb     : np.ndarray = colors[lower_idx]
        upper_rgb     : np.ndarray = colors[lower_idx + 1]
        lut           : np.ndarray = lower_rgb + (upper_rgb - lower_rgb) * factor[:, np.newaxis]

        return np.floor(lut + 0.5).clip(0, 255).astype(np.uint8)