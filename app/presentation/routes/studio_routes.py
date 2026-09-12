# Vespera/app/presentation/routes/studio_routes.py

from typing import Any

from flask import Blueprint, render_template, request

from app.core.utils.decorators import api_standard_endpoint, template_endpoint
from app.infrastructure.palettes import ColorPalettes
from app.modules.turing.services import TuringService

studio_bp : Blueprint     = Blueprint("studio", __name__, url_prefix="/studio")
service   : TuringService = TuringService(verbose=True)
palettes  : ColorPalettes = ColorPalettes()

# --- TEMPLATES ---
@studio_bp.route("/")
@template_endpoint
def studio() -> str:
    """
    Endpoint para el estudio interactivo de síntesis de patrones de Turing.
    :return : HTML del estudio.
    """
    return render_template("studio/studio.html")

# --- APIs ---
@studio_bp.route("/api/palettes", methods=["GET"])
@api_standard_endpoint
def api_get_palettes() -> dict[str, Any]:
    """
    Endpoint para recuperar la lista de paletas disponibles.
    :return : Lista de paletas disponibles.
    """
    return service.get_palettes()

@studio_bp.route("/api/generate", methods=["POST"])
@api_standard_endpoint
def api_generate_pattern() -> dict[str, Any]:
    """
    Endpoint para generar un patrón de Turing en escala de grises a partir de una imagen.
    :return : Patrón de Turing generado y keyframes para la animación.
    """
    return service.generate_synthesis(request.get_json(silent=True) or request.form.to_dict() or {}, request.files.get("file"))

@studio_bp.route("/api/commit", methods=["POST"])
@api_standard_endpoint
def api_commit_pattern() -> dict[str, Any]:
    """
    Endpoint para guardar un patrón de Turing generado en la bóveda.
    :return : Estado de éxito de la operación.
    """
    payload : dict[str, Any] = request.get_json(silent=True) or request.form.to_dict() or {}
    return service.commit_artifact(payload)