# Vespera/app/presentation/routes/compendium_routes.py

from typing import Any

from flask import Blueprint

from app.core.utils.decorators import api_standard_endpoint
from app.modules.spectra.services import SpectraService

compendium_bp : Blueprint      = Blueprint("compendium", __name__, url_prefix="/spectra/compendium")
service       : SpectraService = SpectraService(verbose=True)

# --- APIs ---
@compendium_bp.route("/api/palettes", methods=["GET"])
@api_standard_endpoint
def api_get_palettes() -> dict[str, Any]:
    """
    Endpoint para recuperar el catálogo de paletas de colores.
    :return : Lista de paletas disponibles.
    """
    return service.get_palettes()

