# Vespera/app/presentation/routes/compendium_routes.py

from typing import Any

from flask import Blueprint, render_template, request

from app.core.utils.decorators import api_standard_endpoint, template_endpoint
from app.modules.spectra.services import SpectraService

compendium_bp : Blueprint      = Blueprint("compendium", __name__, url_prefix="/spectra/compendium")
service       : SpectraService = SpectraService(verbose=True)

# --- TEMPLATES ---
@compendium_bp.route("/")
@template_endpoint
def compendium() -> str:
    """
    Endpoint para el compendio de paletas de colores.
    :return : Plantilla del compendio.
    """
    return render_template("compendium/compendium.html")


# --- APIs ---
@compendium_bp.route("/api/palettes", methods=["GET"])
@api_standard_endpoint
def api_get_palettes() -> dict[str, Any]:
    """
    Endpoint para recuperar el catálogo de paletas de colores.
    :return : Lista de paletas disponibles.
    """
    return service.get_palettes()

@compendium_bp.route("/api/create/palette", methods=["POST"])
@api_standard_endpoint
def api_create_palette() -> dict[str, Any]:
    """
    Endpoint para guardar una nueva paleta de colores.
    :return : Datos de la paleta creada.
    """
    payload : dict[str, Any] = request.get_json(silent=True) or request.form.to_dict() or {}
    return service.create_palette(payload)

@compendium_bp.route("/api/update/palette/<int:id_palette>", methods=["POST"])
@api_standard_endpoint
def api_update_palette(id_palette : int) -> dict[str, Any]:
    """
    Endpoint para actualizar una paleta de colores.
    :param id_palette : ID (PK) de la paleta de colores.
    :return           : Datos de la paleta actualizada.
    """
    payload : dict[str, Any] = request.get_json(silent=True) or request.form.to_dict() or {}
    return service.update_palette(id_palette, payload)

@compendium_bp.route("/api/toggle/favorite/palette/<int:id_palette>", methods=["POST"])
@api_standard_endpoint
def api_toggle_favorite(id_palette : int) -> dict[str, Any]:
    """
    Endpoint para alternar el estado de favorita de una paleta de colores.
    :param id_palette : ID (PK) de la paleta de colores.
    :return           : Datos de la paleta actualizada.
    """
    return service.toggle_favorite(id_palette)

@compendium_bp.route("/api/delete/palette/<int:id_palette>", methods=["DELETE"])
@api_standard_endpoint
def api_delete_palette(id_palette : int) -> dict[str, Any]:
    """
    Endpoint para eliminar una paleta de colores.
    :param id_palette : ID (PK) de la paleta de colores.
    :return           : Datos de la paleta eliminada.
    """
    return service.delete_palette(id_palette)


