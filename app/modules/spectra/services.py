# Vespera/app/modules/spectra/services.py

from __future__ import annotations

from typing import Any, Optional
from PIL import Image

from app.infrastructure.models import ColorPalette
from app.modules.spectra.application.palette_service import PaletteService

class SpectraService:
    """
    Servicio para centralizar el manejo de paletas de colores.
    """

    def __init__(self : SpectraService, verbose : bool = False) -> None:
        self.palette_service : PaletteService = PaletteService(verbose)

    def get_palettes(self : SpectraService) -> dict[str, Any]:
        return self.palette_service.get_palettes()

    def get_palette_by_id(self : SpectraService, id_palette : int) -> dict[str, Any]:
        return self.palette_service.get_palette_by_id(id_palette=id_palette)

    def invalidate_palette_cache(self : SpectraService, id_palette : Optional[int] = None) -> dict[str, Any]:
        return self.palette_service.invalidate_lut_cache(id_palette=id_palette)

    def apply_palette_to_grayscale_img(self : SpectraService, gray_img : Image.Image, palette : ColorPalette) -> dict[str, Any]:
        return self.palette_service.apply_palette(gray_img, palette)