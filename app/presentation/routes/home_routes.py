# Vespera/app/presentation/routes/home_routes.py

from flask import Blueprint, redirect, Response

home_bp : Blueprint = Blueprint("home", __name__)

@home_bp.route("/")
def home() -> tuple[Response, int]: return redirect("/studio"), 301