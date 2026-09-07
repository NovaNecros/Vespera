# Vespera/app/__init__.py

from datetime import datetime, timezone

from sqlite3 import Connection as SQLite3Connection
from sqlite3 import Cursor     as SQLite3Cursor
from flask import Flask
from sqlalchemy import event
from sqlalchemy.engine import Engine

from app.core.extensions import db
from app.core.config import DBSettings, Directories, Colors
from app.core.utils.date_utils import format_datetime

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection : object, connection_record : object) -> None:
    """
    Configuración de la DB de SQLite.
    Asegura integridad referencial usando FKs y
    mejora el rendimiento concurrente usando modo WAL.
    """
    if isinstance(dbapi_connection, SQLite3Connection):
        cursor : SQLite3Cursor  = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.close()


def create_app() -> Flask:
    """
    Fabrica la aplicación Flask.
    :return : Instancia de la aplicación Flask.
    """
    Directories.ensure_directories()
    app : Flask = Flask(
        __name__,
        template_folder = str(Directories.TEMPLATES_DIR),
        static_folder   = str(Directories.STATIC_DIR)
    )

    app.config["SQLALCHEMY_DATABASE_URI"]        = DBSettings.DB_URI
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False # Para ahorrar recursos, sino es muy lento.
    app.config["MAX_CONTENT_LENGTH"]             = 32 * 1024 * 1024
    app.secret_key                               = "VESPERA_GOTHIC_TURING_SECRET_20043009"

    db.init_app(app)

    app.jinja_env.filters["strftime"] = format_datetime

    @app.context_processor
    def inject_globals() -> dict[str, object]:
        return {
            "now"         : datetime.now(timezone.utc),
            "system_name" : "VESPERA"
        }

    with app.app_context():
        from app.infrastructure.repositories.models import (
            SourceImage,       ConfigTuring,
            SynthesisArtifact, EnigmaQuest
        )
        db.create_all()
        print(f"[*]{Colors.BLUE} DB INITIALIZED AT: {Colors.RESET}{DBSettings.DB_PATH}")

    try:
        from app.presentation.routes.studio_routes import studio_bp
        from app.presentation.routes.vault_routes  import vault_bp
        #from app.presentation.routes.enigma_routes import enigma_bp

        app.register_blueprint(studio_bp)
        app.register_blueprint(vault_bp)
        #app.register_blueprint(enigma_bp)
    except ImportError as e:
        print(f"[!]{Colors.YELLOW} WARNING - COULD NOT IMPORT ROUTES: {Colors.RESET}{e}")

    return app