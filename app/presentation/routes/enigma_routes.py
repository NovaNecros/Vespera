# Vespera/app/presentation/routes/enigma_routes.py

from typing import Any
from pathlib import Path

from flask import Blueprint, render_template, request

from app.core.config import Directories
from app.core.utils.decorators import api_stream_endpoint, template_endpoint, api_standard_endpoint
from app.modules.enigmas.services import EnigmasService

enigma_bp : Blueprint      = Blueprint("enigma", __name__, url_prefix="/enigma")
service   : EnigmasService = EnigmasService(verbose=True)

# --- TEMPLATES ---
@enigma_bp.route("/22")
@template_endpoint
def enigma22() -> str:
    """
    Endpoint para el enigma CUM22.
    :return : HTML del módulo enigma CUM22.
    """
    return render_template("enigmas/enigma22.html")

# --- APIs ---
@enigma_bp.route("/api/quest/22", methods=["GET"])
@api_standard_endpoint
def api_get_enigma22_quest() -> dict[str, Any]:
    """
    Endpoint para recuperar los datos del enigma de tu cum.
    :return : Datos del enigma CUM22 en la DB.
    """
    return service.get_enigma22_quest()

@enigma_bp.route("/api/verify/22/artifact/<int:id_artifact>", methods=["POST"])
@api_standard_endpoint
def api_verify_enigma22_solution(id_artifact : int) -> dict[str, Any]:
    """
    Endpoint para verificar la solución del enigma de tu cum.
    :return : Resultados de la verificación.
    """
    return service.verify_solution(id_artifact)

# --- STREAMING APIs ---
@enigma_bp.route("/api/stream/hint/22", methods=["GET"])
@api_stream_endpoint(mimetype="image/png")
def api_stream_hint_enigma22() -> Path:
    return Directories.ENIGMAS_DIR / "enigma22.png"