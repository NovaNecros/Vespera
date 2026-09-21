# Vespera/app/modules/spectra/application/palette_service.py

from __future__ import annotations

from typing import Any, Optional
import numpy as np
from PIL import Image

from app.core.extensions import db
from app.core.config import Colors
from app.infrastructure.models import ColorPalette, PaletteStop
from app.modules.spectra.domain.palette_interpolation import PaletteInterpolationModel

class PaletteService:
    """
    Servicio para la administración de paletas de colores para los patrones de memoría.
    Usa Lookup Tables (LUT) como caché.
    """

    _lut_cache : dict[int, np.ndarray] = {}

    def __init__(self : PaletteService, verbose : bool = True) -> None:
        self.verbose             : bool                      = verbose
        self.interpolation_model : PaletteInterpolationModel = PaletteInterpolationModel()

    # --- CRUDs ---
    def get_palettes(self : PaletteService) -> dict[str, Any]:
        """
        Recupera el catálogo de paletas de colores de la DB.
        :return : Lista de diccionarios con las paletas de colores.
        """
        try:
            palettes : list[ColorPalette] = (
                db.session
                    .query(ColorPalette)
                    .options(db.joinedload(ColorPalette.stops))
                    .order_by(ColorPalette.id_palette.asc())
                    .all()
            )
            if not palettes and self.verbose:
                print(f"[!]{Colors.YELLOW} PALETTE CATALOG IS EMPTY{Colors.RESET}")
            return {
                "success"     : True,
                "data"        : [p.to_dict() for p in palettes],
                "status_code" : 200
            }
        except Exception as e:
            raise e

    def get_palette_by_id(self : PaletteService, id_palette : int) -> dict[str, Any]:
        """
        Recupera una paleta de colores según su ID.
        :param id_palette : ID (PK) de la paleta de colores.
        :return           : Fila de la DB con la paleta de colores.
        """
        try:
            row : Optional[ColorPalette] = (
                db.session
                    .query(ColorPalette)
                    .options(db.joinedload(ColorPalette.stops))
                    .filter_by(id_palette=id_palette)
                    .first()
            )
            if not row:
                if self.verbose: print(f"[!]{Colors.RED} Palette with id #{id_palette} not found.{Colors.RESET}")
                return {
                    "success"     : False,
                    "error"       : f"Palette with id #{id_palette} not found.",
                    "status_code" : 404
                }
            return {
                "success"     : True,
                "data"        : row.to_dict(),
                "status_code" : 200
            }
        except Exception as e:
            raise e

    # --- COLORING ---
    def _get_palette_lut(self : PaletteService, palette : ColorPalette) -> np.ndarray:
        """
        Wrapper para el algoritmo que construye una LUT de 256x3 (RGB uint8) para una paleta de colores.
        :param palette : Fila de la DB con la paleta de colores.
        :return        : Arreglo NumPy 256x3 tipo uint8.
        """
        if palette.id_palette in self._lut_cache: return self._lut_cache[palette.id_palette]
        sorted_stops  : list[PaletteStop] = sorted(palette.stops, key=lambda s : float(s.stop_position))
        lut : np.ndarray = self.interpolation_model.interpolate_palette([s.to_dict() for s in sorted_stops])
        self._lut_cache[palette.id_palette] = lut
        return lut

    def invalidate_lut_cache(self : PaletteService, id_palette : Optional[int] = None) -> dict[str, Any]:
        """
        Helper para ignorar el cache de LUTs cuando se edita una paleta de colores.
        :param id_palette : ID de la paleta editada o None para limpiar t0do el caché.
        """
        try:
            if id_palette is None:
                message : str = "All palettes cache has been wiped."
                self._lut_cache.clear()
            else:
                message : str = "Palette was not cached"
                if id_palette in self._lut_cache:
                    self._lut_cache.pop(id_palette, None)
                    message : str = f"Palette ID #{id_palette} cache has been cleared."
            return {
                "success"     : True,
                "message"     : message,
                "status_code" : 200
            }
        except Exception as e:
            raise e

    def apply_palette(self : PaletteService, grayscale_img : Image.Image, palette : ColorPalette) -> dict[str, Any]:
        """
        Mapea una matriz de concentración V a una imagen RGB uint8.
        :param grayscale_img : Imagen en escala de grises.
        :param palette       : Objeto de la DB con la paleta de colores a aplicar.
        :return              : Imagen coloreada con la paleta de colores.
        """
        try:
            if grayscale_img.mode != "L": grayscale_img : Image.Image = grayscale_img.convert("L")
            lut        : np.ndarray = self._get_palette_lut(palette)
            gray_array : np.ndarray = np.asarray(grayscale_img, dtype=np.uint8)
            rgb_array  : np.ndarray = lut[gray_array]
            return {
                "success"     : True,
                "data"        : Image.fromarray(rgb_array, mode="RGB"),
                "status_code" : 200
            }
        except Exception as e:
            raise e
