# Vespera/app/presentation/routes/vault_routes.py

from typing import Any
from pathlib import Path

from flask import Blueprint, render_template, request, abort, send_file, Response

from app.core.utils.decorators import api_standard_endpoint, template_endpoint, api_stream_endpoint
from app.infrastructure.files_repo import FileRepository
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


# --- APIs ---
# ARTIFACTS
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

@vault_bp.route("/api/hydrate/artifact/<int:id_artifact>", methods=["GET"])
@api_standard_endpoint
def api_get_hydration_bundle(id_artifact : int) -> dict[str, Any]:
    """
    Endpoint para recuperar los parámetros de un patrón de Turing y cargarlos en el estudio.
    :param id_artifact : ID (PK) del patrón de Turing en la DB.
    :return            : Parámetros en la DB incluyendo cuadros de animación.
    """
    return service.get_hydration_bundle(id_artifact)

@vault_bp.route("/api/relationship/artifact/<int:id_artifact>/palette/<int:id_palette>", methods=["POST"])
@api_standard_endpoint
def api_create_artifact_palette_rel(id_artifact : int, id_palette : int) -> dict[str, Any]:
    """
    Endpoint para crear una nueva relación entre un patrón de Turing y una paleta de colores
    :param id_artifact : ID (PK) del patrón de Turing en la DB.
    :param id_palette  : ID (PK) de la paleta de colores en la DB.
    :return            : Estado de éxito y detalles de la operación.
    """
    return service.create_artifact_palette_rel(id_artifact, id_palette)

@vault_bp.route("/api/alias/artifact/<int:id_artifact>", methods=["POST"])
@api_standard_endpoint
def api_update_artifact_alias(id_artifact : int) -> dict[str, Any]:
    """
    Endpoint para actualizar el alias de un patrón de Turing.
    :param id_artifact : ID (PK) del patrón.
    :return            : Estado de éxito y detalles de la operación.
    """
    payload : dict[str, Any] = request.get_json(silent=True) or request.form.to_dict() or {}
    return service.update_artifact_alias(id_artifact, payload)

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

@vault_bp.route("/api/delete/relationship/<int:id_rel>", methods=["DELETE"])
@api_standard_endpoint
def api_delete_palette_relation(id_rel : int) -> dict[str, Any]:
    """
    Endpoint para eliminar una relación entre un patrón de Turing y una paleta de colores.
    :param id_rel : ID (PK) de la relación.
    :return       : Estado de éxito y detalles de la operación.
    """
    return service.delete_palette_relation(id_rel)

@vault_bp.route("/api/delete/artifact/<int:id_artifact>", methods=["DELETE"])
@api_standard_endpoint
def api_delete_artifact(id_artifact : int) -> dict[str, Any]:
    """
    Endpoint para eliminar un patrón de Turing.
    :param id_artifact : ID (PK) del patrón).
    :return            : Estado de éxito y detalles de la operación.
    """
    return service.delete_artifact(id_artifact, request.get_json(silent=True) or {})


# SOURCES
@vault_bp.route("/api/sources", methods=["POST"])
@api_standard_endpoint
def api_get_sources_catalog() -> dict[str, Any]:
    """
    Endpoint para obtener el catálogo de imágenes originales.
    :return : Catálogo de imágenes originales en la DB.
    """
    return service.get_sources_catalog(request.get_json(silent=True) or {})

@vault_bp.route("/api/cript", methods=["GET"])
@api_standard_endpoint
def api_get_orphans() -> dict[str, Any]:
    """
    Endpoint para obtener patrones huérfanos.
    :return : Estado de éxito y detalles de la operación.
    """
    return service.get_orphaned_sources()

@vault_bp.route("/api/alias/source/<int:id_source_image>", methods=["POST"])
@api_standard_endpoint
def api_update_source_alias(id_source_image : int) -> dict[str, Any]:
    """
    Endpoint para actualizar el alias de una imagen original.
    :param id_source_image : ID (PK) de la imagen original.
    :return                : Estado de éxito de la operación.
    """
    payload : dict[str, Any] = request.get_json(silent=True) or request.form.to_dict() or {}
    return service.update_source_alias(id_source_image, payload)

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
@vault_bp.route("/api/download/relationship/<int:id_rel>", methods=["GET"])
def api_download_artifact_manifestation(id_rel : int) -> tuple[Response, int]:
    """
    Endpoint para descargar el archivo PNG de un patrón de Turing a color.
    :param id_rel : ID (PK) de la relación entre patrón y paleta.
    :return       : Descarga del archivo.
    """
    try:
        res : dict[str, Any] = service.download_colored_artifact(id_rel=id_rel)
        if not res.get("success"): abort(res.get("status_code", 500))
        payload : dict[str, Any] = res["data"]
        return send_file(
            payload["buffer"],
            mimetype      = payload["mimetype"],
            as_attachment = True,
            download_name = payload["download_name"]
        ), res.get("status_code", 200)
    except Exception as e:
        print(f"[!] Unexpected error streaming colored artifact: {e}")
        import traceback
        traceback.print_exc()
        abort(500)

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

@vault_bp.route("/api/stream/artifact/hash/<string:artifact_hash>/frame/<int:frame_index>", methods=["GET"])
@api_stream_endpoint(mimetype="image/webp")
def api_stream_frame_image(artifact_hash : str, frame_index : int) -> Path:
    """
    Endpoint para obtener un frame en formato WebP para la reproducción de la animación.
    :param artifact_hash : Hash SHA-256 compuesto del patrón.
    :param frame_index   : Número de frame.
    :return              : Ruta al archivo WebP en el disco.
    """
    return FileRepository.get_frame_path(artifact_hash, frame_index)
