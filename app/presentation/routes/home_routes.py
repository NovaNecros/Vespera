# Vespera/app/presentation/routes/home_routes.py

from flask import Blueprint, redirect, Response, render_template

from app.core.utils.decorators import template_endpoint

home_bp : Blueprint = Blueprint("home", __name__)

@home_bp.route("/")
def home() -> tuple[Response, int]:
    """
    Redirige el URL vacío al enigma 22.
    :return : Redirección al HTML del enigma de tu cum :b
    """
    return redirect("/enigma/22"), 301

@home_bp.route("/empty")
@template_endpoint
def empty() -> str:
    """
    Vista vacía para ver el humito (hipnótico).
    :return : Template base vacío.
    """
    return render_template("base.html")