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

        sample_points : np.ndarray = np.linspace(0.0, 1.0, 256)
        r_channel     : np.ndarray = np.interp(sample_points, positions, colors[:,0])
        g_channel     : np.ndarray = np.interp(sample_points, positions, colors[:,1])
        b_channel     : np.ndarray = np.interp(sample_points, positions, colors[:,2])

        return np.column_stack((r_channel, g_channel, b_channel)).astype(np.uint8)