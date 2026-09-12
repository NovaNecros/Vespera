# Vespera/app/core/config.py

from __future__ import annotations

from pathlib import Path
from colorama import Fore, Style, init

init(autoreset=True, strip=False)

BASE_DIR : Path = Path(__file__).parent.parent.parent

class ServerSettings:
    """
    Configuración del servidor web local.
    """
    HOST  : str  = "0.0.0.0"
    PORT  : int  = 3009
    DEBUG : bool = True

class DBSettings:
    """
    Configuración de la base de datos local con SQLite.
    """
    DB_PATH : Path = BASE_DIR / "data" / "vespera.db"
    DB_URI  : str  = f"sqlite:///{DB_PATH}"

class RNGSettings:
    """
    Configuración del generador de números aleatorios para asegurar determinismo.
    """
    SEED : int = 20043009

class Directories:
    """
    Rutas del proyecto.
    """
    BASE_DIR       : Path = BASE_DIR
    DATA_DIR       : Path = BASE_DIR     / "data"
    INPUTS_DIR     : Path = DATA_DIR     / "inputs"
    ENIGMAS_DIR    : Path = INPUTS_DIR   / "enigmas"
    OUTPUTS_DIR    : Path = DATA_DIR     / "outputs"
    THUMBNAILS_DIR : Path = OUTPUTS_DIR  / "thumbnails"
    FRAMES_DIR     : Path = OUTPUTS_DIR  / "frames"
    TEMPLATES_DIR  : Path = BASE_DIR     / "app" / "presentation" / "templates"
    STATIC_DIR     : Path = BASE_DIR     / "app" / "presentation" / "static"
    CSS_DIR        : Path = STATIC_DIR   / "css"
    JS_DIR         : Path = STATIC_DIR   / "js"
    TS_DIR         : Path = STATIC_DIR   / "ts"

    @classmethod
    def ensure_directories(cls : type[Directories]) -> None:
        """
        Crea los directorios requeridos.
        """
        for directory in [
            cls.DATA_DIR,
            cls.INPUTS_DIR,
            cls.ENIGMAS_DIR,
            cls.OUTPUTS_DIR,
            cls.THUMBNAILS_DIR,
            cls.FRAMES_DIR,
            cls.TEMPLATES_DIR,
            cls.STATIC_DIR,
            cls.CSS_DIR,
            cls.JS_DIR,
            cls.TS_DIR
        ]:
            directory.mkdir(parents=True, exist_ok=True)

class TuringSettings:
    """
    Parámetros por defecto para las simulaciones Gray-Scott.
    """
    DEFAULT_FEED_RATE         : float = 0.0545
    DEFAULT_KILL_RATE         : float = 0.0620
    DEFAULT_DIFF_U            : float = 1.0000
    DEFAULT_DIFF_V            : float = 0.5000
    DEFAULT_DT                : float = 1.0000
    DEFAULT_ITERATIONS        : int   = 12000
    DEFAULT_FRAMES            : int   = 60
    DEFAULT_FRAME_DENSITY_EXP : float = 3.2
    DEFAULT_PALETTE           : str   = "crimson_eclipse"
    DEFAULT_WIDTH             : int   = 1024
    DEFAULT_HEIGHT            : int   = 1024
    MAX_IMAGE_DIMENSION       : int   = 2048

class Colors:
    """
    Colores para la terminal.
    """
    RED     : str = Fore.RED
    GREEN   : str = Fore.GREEN
    BLUE    : str = Fore.BLUE
    YELLOW  : str = Fore.YELLOW
    MAGENTA : str = Fore.MAGENTA
    CYAN    : str = Fore.CYAN
    WHITE   : str = Fore.WHITE
    BLACK   : str = Fore.BLACK
    RESET   : str = Style.RESET_ALL
