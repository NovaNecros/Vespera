# Vespera/app/modules/turing/services.py

from __future__ import annotations

from typing import Any, Optional
from app.modules.turing.application.synthesis_service import SynthesisService
from app.modules.turing.application.vault_service     import VaultService

class TuringService:
    """
    Servicio que centraliza y orquesta el módulo de síntesis de patrones de Turing.
    """

    def __init__(self : TuringService, verbose : bool = True) -> None:
        self.synthesis_service : SynthesisService = SynthesisService(verbose=verbose)
        self.vault_service     : VaultService     = VaultService(verbose=verbose)

    # --- SYNTHESIS ---
    def generate_synthesis(
        self       : TuringService,
        params     : dict[str, Any],
        file_bytes : Optional[bytes] = None
    ) -> dict[str, Any]:
        """
        Wrapper para la síntesis y almacenamiento de patrones de Turing.
        :param params     : Parámetros de la petición.
        :param file_bytes : Contenido binario de la imagen.
        :return           : Datos del patrón generado.
        """
        return self.synthesis_service.generate_synthesis(params=params, file_bytes=file_bytes)

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

    def delete_artifact(self : TuringService, id_artifact : int) -> dict[str, Any]:
        """
        Wrapper para eliminar un patrón de Turing de la DB y sus archivos del almacenamiento.
        """
        return self.vault_service.delete_artifact(id_artifact=id_artifact)