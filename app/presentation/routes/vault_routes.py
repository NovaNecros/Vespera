# Vespera/app/presentation/routes/vault_routes.py

from typing import Any
from pathlib import Path

from flask import Blueprint, render_template, request

from app.core.utils.decorators import api_standard_endpoint, template_endpoint, api_stream_endpoint
from app.infrastructure.repositories.files_repo import FileRepository
from app.modules.turing.services import TuringService

vault_bp : Blueprint     = Blueprint("vault", __name__, url_prefix="/vault")
service  : TuringService = TuringService(verbose=True)

# --- TEMPLATES ---
@vault_bp.route("/")
@template_endpoint
def vault() -> str:
    """
    Endpoint para la bóveda de almacenamiento de imágenes y patrones.
    :return : HTML de la bóveda.
    """
    return render_template("vault/vault.html")

@vault_bp.route("/cript")
@template_endpoint
def cript() -> str:
    """
    Endpoint para la cripta de imágenes fantasma y huérfanas.
    :return : HTML de la cripta.
    """
    return render_template("vault/cript.html")

# --- APIs ---
# Bóveda
@vault_bp.route("/api/gallery", methods=["POST"])
@api_standard_endpoint
def api_get_vault_gallery() -> dict[str, Any]:
    """
    Endpoint para obtener la galería de imágenes de la bóveda.
    :return : Galería de imágenes.
    """
    return service.get_vault_gallery(request.get_json(silent=True) or {})

@vault_bp.route("/api/artifact/<int:id_artifact>", methods=["GET"])
@api_standard_endpoint
def api_get_artifact(id_artifact : int) -> dict[str, Any]:
    """
    Endpoint para obtener un patrón de Turing y su registro de la DB.
    :param id_artifact : ID (PK) del patrón).
    :return            : Datos recuperados.
    """
    return service.get_artifact_detail(id_artifact)

@vault_bp.route("/api/toggle/favorite/artifact/<int:id_artifact>", methods=["POST"])
@api_standard_endpoint
def api_toggle_favorite(id_artifact : int) -> dict[str, Any]:
    """
    Endpoint para alternar el estado de favorito de un patrón de Turing.
    :param id_artifact : ID (PK) del patrón.
    :return            : Estado de éxito y detalles de la operación.
    """
    return service.toggle_favorite(id_artifact)

@vault_bp.route("/api/update/notes/artifact/<int:id_artifact>", methods=["POST"])
@api_standard_endpoint
def api_update_notes(id_artifact : int) -> dict[str, Any]:
    """
    Endpoint para actualizar las notas personales de un patrón de Turing.
    :param id_artifact : ID (PK) del patrón.
    :return            : Estado de éxito y detalles de la operación.
    """
    return service.update_notes(id_artifact, request.get_json(silent=True) or request.form.to_dict() or {})

@vault_bp.route("/api/delete/artifact/<int:id_artifact>", methods=["DELETE"])
@api_standard_endpoint
def api_delete_artifact(id_artifact : int) -> dict[str, Any]:
    """
    Endpoint para eliminar un patrón de Turing.
    :param id_artifact : ID (PK) del patrón).
    :return            : Estado de éxito y detalles de la operación.
    """
    return service.delete_artifact(id_artifact, request.get_json(silent=True) or {})

# Cripta
@vault_bp.route("/api/cript", methods=["GET"])
@api_standard_endpoint
def api_get_orphans() -> dict[str, Any]:
    """
    Endpoint para obtener patrones huérfanos.
    :return : Estado de éxito y detalles de la operación.
    """
    return service.get_orphaned_sources()

@vault_bp.route("/api/cript/delete/source/<int:id_source_image>", methods=["DELETE"])
@api_standard_endpoint
def api_delete_source_image(id_source_image : int) -> dict[str, Any]:
    """
    Endpoint para eliminar una imagen de origen que ha quedado huérfana.
    :param id_source_image : ID (PK) de la imagen de origen.
    :return                : Estado de éxito y detalles de la operación.
    """
    return service.delete_source_image(id_source_image)

# --- STREAMING APIs ---
@vault_bp.route("/api/stream/artifact/hash/<string:artifact_hash>", methods=["GET"])
@api_stream_endpoint(mimetype="image/png")
def api_stream_artifact_image(artifact_hash : str) -> Path:
    """
    Endpoint para obtener el archivo PNG en HD de un patrón de Turing.
    :param artifact_hash : Hash SHA-256 compuesto del patrón.
    :return              : Bytes del archivo PNG.
    """
    return FileRepository.get_artifact_path(artifact_hash)


@vault_bp.route("/api/stream/thumbnail/hash/<string:artifact_hash>", methods=["GET"])
@api_stream_endpoint(mimetype="image/png")
def api_stream_thumbnail_image(artifact_hash : str) -> Path:
    """
    Endpoint para obtener el archivo PNG en HD de un thumbnail de patrón de Turing.
    :param artifact_hash : Hash SHA-256 compuesto del patrón.
    :return              : Bytes del archivo PNG.
    """
    return FileRepository.get_thumbnail_path(artifact_hash)


@vault_bp.route("/api/stream/source/hash/<string:source_hash>", methods=["GET"])
@api_stream_endpoint(mimetype="image/png")
def api_stream_source_image(source_hash : str) -> Path:
    """
    Endpoint para obtener el archivo PNG en HD de una imagen original.
    :param source_hash : Hash SHA-256 de la imagen.
    :return            : Bytes del archivo PNG.
    """
    return FileRepository.get_source_path(source_hash)
