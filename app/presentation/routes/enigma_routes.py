# Vespera/app/presentation/routes/enigma_routes.py

from pathlib import Path

from flask import Blueprint, abort

from app.core.config import Directories
from app.core.utils.decorators import api_stream_endpoint, template_endpoint

enigma_bp : Blueprint = Blueprint("enigma", __name__, url_prefix="/enigma")

# --- TEMPLATES ---
@enigma_bp.route("/")
@template_endpoint
def enigma() -> str:
    """
    Endpoint para el enigma.
    :return : Plantilla del enigma.
    """
    return abort(501)

# --- STREAMING APIs ---
@enigma_bp.route("/api/enigma/22", methods=["GET"])
@api_stream_endpoint(mimetype="image/png")
def api_stream_enigma22() -> Path:
    return Directories.ENIGMAS_DIR / "enigma22.png"