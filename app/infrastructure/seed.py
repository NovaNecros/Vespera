# Vespera/app/infrastructure/seed.py

from typing import Any, Optional
import traceback

from app.core.extensions import db
from app.core.config import Colors
from app.core.utils.cryptography_utils import compute_params_hash
from app.infrastructure.models import ColorPalette, PaletteStop, ConfigTuring

def seed_palettes() -> bool:
    """
    Si la tabla de paletas está vacía, inserta los valores por defecto.
    """
    try:
        if db.session.query(ColorPalette).filter_by(is_system=True).count() > 0: return False

        system_palettes : dict[str, dict[str, Any]] = {
            "crimson_eclipse"    : {
                "display_name" : "Crimson Eclipse",
                "stops"        : [
                    (0.00, ( 10,  10,  12)), # Obsidian Abyss
                    (0.25, ( 90,   0,  10)), # Deep Blood Velvet
                    (0.55, (160,   0,  16)), # Vivid Crimson
                    (0.80, (215,  60,  40)), # Burning Ember
                    (1.00, (159, 165, 181))  # Pale Silver Highlight
                ],
            },
            "brat"               : {
                "display_name" : "BRAT",
                "stops"        : [
                    (0.00, (  8,  12,   4)),
                    (0.25, ( 46,  78,   6)),
                    (0.50, (138, 206,   0)), # Brat Oficial :b
                    (0.75, (192, 245,  38)),
                    (1.00, (240, 255, 214))
                ]
            }

        }

        for name, config in system_palettes.items():
            display_name : str                                           = str(config["display_name"])
            stops        : list[tuple[float, tuple[int, int, int]]] = config["stops"]
            palette : ColorPalette = ColorPalette(
                name         = name,
                display_name = display_name,
                is_system    = True,
                is_favorite  = (name == "brat")
            )
            db.session.add(palette)
            db.session.flush()

            for stop_pos, (r, g, b) in stops:
                palette_stop : PaletteStop = PaletteStop(
                    id_palette    = palette.id_palette,
                    stop_position = stop_pos,
                    r             = r,
                    g             = g,
                    b             = b
                )
                db.session.add(palette_stop)

        db.session.commit()
        return True

    except Exception as e:
        db.session.rollback()
        raise e

def seed_configs() -> bool:
    """
    Si la tabla de configuraciones está vacía, se insertan las configuraciones por defecto.
    """
    try:
        if db.session.query(ConfigTuring).filter_by(is_system=True).count() > 0: return False

        system_configs : list[dict[str, Any]] = [
            {
                "display_name" : "Carmilla's Labyrinth",
                "feed_rate"    : 0.0545,
                "kill_rate"    : 0.0620,
                "diff_u"       : 1.0000,
                "diff_v"       : 0.5000,
                "dt"           : 1.0000,
                "iterations"   : 12000
            },
            {
                "display_name" : "Arterial Dewdrops",
                "feed_rate"    : 0.0367,
                "kill_rate"    : 0.0649,
                "diff_u"       : 1.0000,
                "diff_v"       : 0.5000,
                "dt"           : 1.0000,
                "iterations"   : 14000
            },
            {
                "display_name" : "Moonlight Pulse",
                "feed_rate"    : 0.0300,
                "kill_rate"    : 0.0620,
                "diff_u"       : 1.0000,
                "diff_v"       : 0.5000,
                "dt"           : 1.0000,
                "iterations"   : 12000
            },
            {
                "display_name" : "Coven's Delirium",
                "feed_rate"    : 0.0180,
                "kill_rate"    : 0.0510,
                "diff_u"       : 1.0000,
                "diff_v"       : 0.5000,
                "dt"           : 1.0000,
                "iterations"   : 12000
            },
            {
                "display_name" : "Kiss of Eternity",
                "feed_rate"    : 0.0300,
                "kill_rate"    : 0.0630,
                "diff_u"       : 1.0000,
                "diff_v"       : 0.5000,
                "dt"           : 1.0000,
                "iterations"   : 19000
            }
        ]

        for cfg in system_configs:
            config_hash : str = compute_params_hash(
                feed_rate  = cfg["feed_rate"],
                kill_rate  = cfg["kill_rate"],
                diff_u     = cfg["diff_u"],
                diff_v     = cfg["diff_v"],
                dt         = cfg["dt"],
                iterations = cfg["iterations"]
            )

            existing_cfg : Optional[ConfigTuring] = (
                db.session
                    .query(ConfigTuring)
                    .filter_by(config_hash=config_hash)
                    .first()
            )

            if existing_cfg:
                existing_cfg.is_system    = True
                existing_cfg.display_name = cfg["display_name"]
            else:
                new_cfg : ConfigTuring = ConfigTuring(
                    config_hash  = config_hash,
                    display_name = cfg["display_name"],
                    is_system    = True,
                    feed_rate    = cfg["feed_rate"],
                    kill_rate    = cfg["kill_rate"],
                    diff_u       = cfg["diff_u"],
                    diff_v       = cfg["diff_v"],
                    dt           = cfg["dt"],
                    iterations   = cfg["iterations"],
                )
                db.session.add(new_cfg)

        db.session.commit()
        return True

    except Exception as e:
        db.session.rollback()
        raise e

def seed_db() -> bool:
    """
    Llena los valores por defecto en la base de datos.
    """
    try:
        palettes_seeded : bool = seed_palettes()
        configs_seeded  : bool = seed_configs()

        if palettes_seeded or configs_seeded: return True
        return False

    except Exception as e:
        print(f"[!]{Colors.RED} UNEXPECTED ERROR SEEDING DB: {Colors.RESET}{e}")
        traceback.print_exc()
        raise e