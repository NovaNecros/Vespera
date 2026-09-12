# Vespera/app/infrastructure/repositories/seed.py

import traceback

from app.core.extensions import db
from app.core.config import Colors
from app.infrastructure.repositories.models import ColorPalette, PaletteStop
from app.infrastructure.palettes import ColorPalettes as SystemPalettes

def seed_palettes() -> None:
    """
    Si la tabla de paletas está vacía, inserta los valores por defecto.
    """
    try:
        if db.session.query(ColorPalette).count() > 0: return

        for name, stops in SystemPalettes.PALETTES_CONFIG.items():
            display_name : str = name.replace("_", " ").title()
            palette : ColorPalette = ColorPalette(
                name         = name,
                display_name = display_name,
                is_system    = True
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