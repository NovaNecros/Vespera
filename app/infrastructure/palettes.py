# Vespera/app/infrastructure/palettes.py

from __future__ import annotations

import numpy as np

from app.core.utils.text_utils import normalize_text

class ColorPalettes:
    """
    Lookup Tables (LUT) y gradientes para transformar campos
    escalares de concentración V en imágenes RGB a una paleta de colores.
    """

    # Puntos de control para los gradientes en las paletas de colores
    PALETTES_CONFIG : dict[str, list[tuple[float, tuple[int, int, int]]]] = {
        "crimson_eclipse"   : [
            (0.00, ( 10,  10,  12)), # Obsidian Abyss
            (0.25, ( 90,   0,  10)), # Deep Blood Velvet
            (0.55, (160,   0,  16)), # Vivid Crimson
            (0.80, (215,  60,  40)), # Burning Ember
            (1.00, (245, 210, 150))  # Pale Gold Highlight
        ],
        "obsidian_gold"     : [
            (0.00, ( 5,    5,   5)), # Absolute Obsidian
            (0.30, ( 55,  35,   5)), # Dark Amber Bronze
            (0.65, (197, 160,  89)), # Antique Gilded Gold
            (0.85, (230, 205, 145)), # Bright Filigree
            (1.00, (250, 245, 235))  # Ivory Glow
        ],
        "alchemical_violet" : [
            (0.00, (  8,   2,  15)), # Void Black
            (0.30, ( 61,  16,  89)), # Shadow Amethyst
            (0.60, (122,  32, 176)), # Royal Violet
            (0.85, (185,  95, 235)), # Electric Orchid
            (1.00, (235, 215, 250))  # Ethereal Lilac
        ],
        "bone_charcoal"     : [
            (0.00, ( 14,  14,  16)), # Charcoal Pitch
            (0.30, ( 45,  48,  54)), # Dark Slate
            (0.60, (110, 115, 122)), # Ash Grey
            (0.85, (195, 190, 180)), # Weathered Skull
            (1.00, (240, 235, 225)), # Bleached Bone
        ],
        "emerald_poison"    : [
            (0.00, (  2,  13,   8)), # Deep Swamp Abyss
            (0.25, ( 10,  61,  34)), # Malachite Shadow
            (0.55, ( 21, 143,  75)), # Witch Emerald
            (0.80, ( 85, 220, 140)), # Toxic Glow
            (1.00, (200, 250, 225))  # Ghost Mint
        ],
        "sanguis_nocturna"  : [
            (0.00, (  0,  0,    0)), # Pure Void
            (0.35, ( 46,  0,    0)), # Coagulated Red
            (0.70, (138,  3,    3)), # Pure Crimson
            (0.90, (210, 30,   30)), # Arterial Surge
            (1.00, (255, 255, 255))  # Spectral White
        ]
    }

    _lut_cache : dict[str, np.ndarray] = {}

    @classmethod
    def get_palette_names(cls : type[ColorPalettes]) -> list[str]:
        """
        Helper para obtener las paletas de colores disponibles.
        """
        return list(cls.PALETTES_CONFIG.keys())

    @classmethod
    def get_lookup_table(cls : type[ColorPalettes], palette_name : str) -> np.ndarray:
        """
        Construye o recupera del caché una LUT de 256x3 (RGB uint8).
        :param palette_name : Identificador de la paleta de colores.
        :return             : Arreglo NumPy 256x3 tipo uint8.
        """
        try:
            normalized_name : str = normalize_text(palette_name)
            if normalized_name not in cls.PALETTES_CONFIG:
                raise ValueError(f"Invalid palette: {palette_name or ''}")

            if normalized_name in cls._lut_cache: return cls._lut_cache[normalized_name]

            anchors   : list[tuple[float, tuple[int, int, int]]] = cls.PALETTES_CONFIG[normalized_name]
            positions : np.ndarray = np.array([pt[0] for pt in anchors], dtype=np.float64)
            colors    : np.ndarray = np.array([pt[1] for pt in anchors], dtype=np.float64)

            sample_points : np.ndarray = np.linspace(0.0, 1.0, 256)
            r_channel     : np.ndarray = np.interp(sample_points, positions, colors[:,0])
            g_channel     : np.ndarray = np.interp(sample_points, positions, colors[:,1])
            b_channel     : np.ndarray = np.interp(sample_points, positions, colors[:,2])

            lut : np.ndarray = np.column_stack((r_channel, g_channel, b_channel)).astype(np.uint8)
            cls._lut_cache[normalized_name] = lut
            return lut

        except Exception as e:
            raise e

    @classmethod
    def apply_palette(
        cls          : type[ColorPalettes],
        v_matrix     : np.ndarray,
        palette_name : str
    ) -> np.ndarray:
        """
        Mapea una matriz de concentración V a una imagen RGB uint8.
        :param v_matrix     : Matriz de NumPy con valores en [0.0, 1.0].
        :param palette_name : Nombre de la paleta de colores.
        :return             : Arreglo 3D (H, W, 3) de NumPy tipo uint8.
        """
        try:
            lut : np.ndarray = cls.get_lookup_table(palette_name=palette_name)

            # Normalización por si acaso
            clamped_v : np.ndarray = np.clip(v_matrix, 0.0, 1.0)
            indices   : np.ndarray = (clamped_v * 255.0).astype(np.uint8)

            rgb_image : np.ndarray = lut[indices]
            return rgb_image

        except Exception as e:
            raise e