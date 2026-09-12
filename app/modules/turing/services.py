# Vespera/app/modules/turing/services.py

from __future__ import annotations

from typing import Any, Optional

from werkzeug.datastructures import FileStorage

from app.core.extensions import db
from app.core.config import Colors
from app.infrastructure.repositories.models import ColorPalette
from app.modules.turing.application.synthesis_service import SynthesisService
from app.modules.turing.application.vault_service     import VaultService

class TuringService:
    """
    Servicio que centraliza y orquesta el módulo de síntesis de patrones de Turing.
    """

    def __init__(self : TuringService, verbose : bool = True) -> None:
        self.synthesis_service : SynthesisService = SynthesisService(verbose=verbose)
        self.vault_service     : VaultService     = VaultService(verbose=verbose)

    # --- GENERAL ---
    @staticmethod
    def get_palettes() -> dict[str, Any]:
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
            return {
                "success"     : True,
                "data"        : [p.to_dict() for p in palettes],
                "status_code" : 200
            }
        except Exception as e:
            print(f"[!]{Colors.RED} UNEXPECTED ERROR FETCHING COLOR PALETTE CATALOG:{Colors.RESET} {e}")
            return {
                "success"     : False,
                "message"     : str(e),
                "status_code" : 500
            }

    # --- SYNTHESIS ---
    def generate_synthesis(
        self         : TuringService,
        params       : dict[str, Any],
        source_image : Optional[FileStorage]
    ) -> dict[str, Any]:
        """
        Wrapper para la síntesis de patrones de Turing.
        :param params       : Parámetros de la petición.
        :param source_image : Contenido binario de la imagen.
        :return             : Datos del patrón generado.
        """
        return self.synthesis_service.generate_synthesis(params=params, source_image=source_image)

    def commit_artifact(
        self   : TuringService,
        params : dict[str, Any]
    ) -> dict[str, Any]:
        """
        Wrapper para el almacenamiento de patrones de Turing.
        :param params : Parámetros de la petición.
        :return       : Datos del patrón almacenado.
        """
        return self.synthesis_service.commit_artifact(params=params)

    # --- VAULT ---
    def get_vault_gallery(self : TuringService, params : dict[str, Any]) -> dict[str, Any]:
        """
        Wrapper para consultar la galería con filtros.
        """
        return self.vault_service.get_vault_gallery(params=params)

    def get_artifact_detail(self : TuringService, id_artifact : int) -> dict[str, Any]:
        """
        Wrapper para consultar el detalle de un patrón de Turing generado.
        """
        return self.vault_service.get_artifact_detail(id_artifact=id_artifact)

    def toggle_favorite(self : TuringService, id_artifact : int) -> dict[str, Any]:
        """
        Wrapper para marcar/desmarcar un patrón de Turing como favorito.
        """
        return self.vault_service.toggle_favorite(id_artifact=id_artifact)

    def update_notes(self : TuringService, id_artifact : int, params : dict[str, Any]) -> dict[str, Any]:
        """
        Wrapper para actualizar las notas personales de un patrón de Turing.
        """
        return self.vault_service.update_notes(id_artifact=id_artifact, params=params)

    def get_orphaned_sources(self : TuringService) -> dict[str, Any]:
        """
        Wrapper para consultar las imágenes originales huérfanas.
        """
        return self.vault_service.get_orphaned_sources()

    def delete_source_image(self : TuringService, id_source_image : int) -> dict[str, Any]:
        """
        Wrapper para eliminar definitivamente una imagen original huérfana.
        """
        return self.vault_service.delete_source_image(id_source_image=id_source_image)

    def delete_artifact(self : TuringService, id_artifact : int, params : dict[str, Any]) -> dict[str, Any]:
        """
        Wrapper para eliminar un patrón de Turing de la DB y sus archivos del almacenamiento.
        """
        return self.vault_service.delete_artifact(id_artifact=id_artifact, params=params)