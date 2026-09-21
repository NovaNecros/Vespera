# Vespera/app/modules/turing/services.py

from __future__ import annotations

from typing import Any, Optional

from werkzeug.datastructures import FileStorage

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
    def generate_synthesis(self : TuringService, params : dict[str, Any], source_image : Optional[FileStorage]) -> dict[str, Any]:
        return self.synthesis_service.generate_synthesis(params=params, source_image=source_image)

    def commit_artifact(self : TuringService, params : dict[str, Any]) -> dict[str, Any]:
        return self.synthesis_service.commit_artifact(params=params)


    # --- VAULT ---
    # Artifacts
    def get_vault_gallery(self : TuringService, params : dict[str, Any]) -> dict[str, Any]:
        return self.vault_service.get_vault_gallery(params=params)

    def get_artifact_detail(self : TuringService, id_artifact : int) -> dict[str, Any]:
        return self.vault_service.get_artifact_detail(id_artifact=id_artifact)

    def get_hydration_bundle(self : TuringService, id_artifact : int, id_palette : Optional[int] = None) -> dict[str, Any]:
        return self.vault_service.get_hydration_bundle(id_artifact=id_artifact, id_palette=id_palette)

    def download_colored_artifact(self : TuringService, id_rel : int) -> dict[str, Any]:
        return self.vault_service.get_colored_artifact_download(id_rel=id_rel)

    def create_artifact_palette_rel(self : TuringService, id_artifact : int, id_palette : int) -> dict[str, Any]:
        return self.vault_service.add_artifact_palette(id_artifact, id_palette)

    def update_artifact_alias(self : TuringService, id_artifact : int, params : dict[str, Any]) -> dict[str, Any]:
        return self.vault_service.update_alias(target_type="artifact", target_id=id_artifact, params=params)

    def toggle_favorite(self : TuringService, id_artifact : int) -> dict[str, Any]:
        return self.vault_service.toggle_favorite(id_artifact=id_artifact)

    def update_notes(self : TuringService, id_artifact : int, params : dict[str, Any]) -> dict[str, Any]:
        return self.vault_service.update_notes(id_artifact=id_artifact, params=params)

    def delete_palette_relation(self : TuringService, id_rel : int) -> dict[str, Any]:
        return self.vault_service.delete_palette_relation(id_rel)

    def delete_artifact(self : TuringService, id_artifact : int, params : dict[str, Any]) -> dict[str, Any]:
        return self.vault_service.delete_artifact(id_artifact=id_artifact, params=params)

    # Sources
    def get_sources_catalog(self : TuringService, params : dict[str, Any]) -> dict[str, Any]:
        return self.vault_service.get_sources_catalog(params=params)

    def update_source_alias(self : TuringService, id_source_image : int, params : dict[str, Any]) -> dict[str, Any]:
        return self.vault_service.update_alias(target_type="source", target_id=id_source_image, params=params)

    def get_orphaned_sources(self : TuringService) -> dict[str, Any]:
        return self.vault_service.get_orphaned_sources()

    def delete_source_image(self : TuringService, id_source_image : int) -> dict[str, Any]:
        return self.vault_service.delete_source_image(id_source_image=id_source_image)

