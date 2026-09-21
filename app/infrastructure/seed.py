# Vespera/app/infrastructure/seed.py

from typing import Any
import traceback

from app.core.extensions import db
from app.core.config import Colors
from app.infrastructure.models import ColorPalette, PaletteStop

def seed_palettes() -> None:
    """
    Si la tabla de paletas está vacía, inserta los valores por defecto.
    """
    try:
        if db.session.query(ColorPalette).count() > 0: return

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
            "carmillas_solstice" : {
                "display_name" : "Carmilla's Solstice",
                "stops"        : [
                    (0.00, (  6,   4,   8)),
                    (0.25, ( 84,  18,  22)),
                    (0.50, (170,  24,  44)),
                    (0.78, (224, 142,  58)),
                    (1.00, (252, 238, 204))
                ]
            },
            "ophelias_drowning"  : {
                "display_name" : "Ophelia's Drowning",
                "stops"        : [
                    (0.00, (  3,  10,  14)),
                    (0.28, ( 12,  58,  66)),
                    (0.58, ( 26, 124, 138)),
                    (0.82, ( 94, 198, 182)),
                    (1.00, (222, 246, 238))
                ]
            },
            "nocturnal_coven"    : {
                "display_name" : "Nocturnal Coven",
                "stops"        : [
                    (0.00, ( 12,   4,  18)),
                    (0.26, ( 64,  14,  88)),
                    (0.54, (138,  28, 178)),
                    (0.80, (216,  68, 204)),
                    (1.00, (244, 218, 252))
                ]
            },
            "witchfire_moss"     : {
                "display_name" : "Witchfire Moss",
                "stops"        : [
                    (0.00, (  4,  12,   8)),
                    (0.28, ( 18,  64,  32)),
                    (0.58, ( 42, 148,  68)),
                    (0.82, (142, 222,  94)),
                    (1.00, (224, 252, 212))
                ]
            },
            "moonlit_mausoleum"  : {
                "display_name" : "Moonlit Mausoleum",
                "stops"        : [
                    (0.00, ( 10,  12,  18)),
                    (0.30, ( 42,  48,  68)),
                    (0.60, (104, 114, 138)),
                    (0.84, (182, 188, 204)),
                    (1.00, (242, 245, 252))
                ]
            },
            "velvet_dusk"        : {
                "display_name" : "Velvet Dusk",
                "stops"        : [
                    (0.00, ( 16,   6,  12)),
                    (0.28, ( 76,  20,  48)),
                    (0.56, (146,  52,  84)),
                    (0.80, (218, 124, 122)),
                    (1.00, (250, 226, 214))
                ]
            },
            "hecates_nebula"     : {
                "display_name" : "Hecate's Nebula",
                "stops"        : [
                    (0.00, (  8,   6,  16)),
                    (0.24, ( 32,  28,  92)),
                    (0.52, (108,  36, 138)),
                    (0.78, (198,  48, 124)),
                    (1.00, (254, 218, 164))
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
                is_favorite  = (name == "crimson_eclipse")
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
    except Exception as e:
        db.session.rollback()
        raise e

def seed_db() -> None:
    """
    Llena los valores por defecto en la base de datos.
    """
    try:
        seed_palettes()
    except Exception as e:
        print(f"[!]{Colors.RED} UNEXPECTED ERROR SEEDING DB: {Colors.RESET}{e}")
        traceback.print_exc()
        raise e