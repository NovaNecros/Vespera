# Vespera/app/modules/spectra/application/palette_service.py

from __future__ import annotations

from time import perf_counter
from typing import Any, Optional
import numpy as np
from PIL import Image

from app.core.extensions import db
from app.core.config import Colors
from app.core.utils.text_utils import sanitize_filename, normalize_text
from app.infrastructure.models import ColorPalette, PaletteStop
from app.modules.spectra.domain.palette_interpolation import PaletteInterpolationModel

class PaletteService:
    """
    Servicio para la administración de paletas de colores para los patrones de memoría.
    Usa Lookup Tables (LUT) como caché.
    """

    _lut_cache : dict[int, np.ndarray] = {}

    def __init__(self : PaletteService, verbose : bool = True) -> None:
        self.verbose             : bool                      = verbose
        self.interpolation_model : PaletteInterpolationModel = PaletteInterpolationModel()

    # --- HELPERS ---
    @staticmethod
    def _are_palettes_equal(
        existing_stops : list[PaletteStop],
        new_stops_raw  : list[dict[str, Any]],
        tolerance       : float = 1e-4
    ) -> bool:
        """
        Helper para comparar dos paletas cromáticas.
        :param existing_stops : Lista de colores de la paleta original (objeto PaletteStop).
        :param new_stops_raw  : Lista de colores de la segunda paleta (en formato raw).
        :param tolerance      : Tolerancia para aceptar que ambas posiciones son iguales.
        :return               : True si las paletas son equivalentes, False sino.
        """
        if len(existing_stops) != len(new_stops_raw): return False

        sorted_existing : list[PaletteStop] = sorted(
            existing_stops,
            key = lambda s : float(s.stop_position)
        )
        sorted_new : list[dict[str, Any]] = sorted(
            new_stops_raw,
            key = lambda s : float(s["stop_position"])
        )

        for old_stop, new_stop in zip(sorted_existing, sorted_new):
            pos_diff : float = abs(float(old_stop.stop_position) - float(new_stop["stop_position"]))
            if ((pos_diff > tolerance)                  or
                (int(old_stop.r) != int(new_stop["r"])) or
                (int(old_stop.g) != int(new_stop["g"])) or
                (int(old_stop.b) != int(new_stop["b"]))
            ):  return False
        return True

    # --- CRUDs ---
    def get_palettes(self : PaletteService) -> dict[str, Any]:
        """
        Recupera el catálogo de paletas de colores de la DB.
        :return : Lista de diccionarios con las paletas de colores.
        """
        try:
            palettes : list[ColorPalette] = (
                db.session
                    .query(ColorPalette)
                    .options(db.joinedload(ColorPalette.stops))
                    .order_by(ColorPalette.id_palette.asc())
                    .all()
            )
            if not palettes:
                print(f"[!]{Colors.YELLOW} PALETTE CATALOG IS EMPTY{Colors.RESET}")
            elif self.verbose:
                print(f"[OK]{Colors.GREEN} FOUND {len(palettes)} PALETTES.{Colors.RESET}")
            return {
                "success"     : True,
                "data"        : [p.to_dict() for p in palettes],
                "status_code" : 200
            }
        except Exception as e:
            raise e

    def get_palette_by_id(self : PaletteService, id_palette : int) -> dict[str, Any]:
        """
        Recupera una paleta de colores según su ID.
        :param id_palette : ID (PK) de la paleta de colores.
        :return           : Fila de la DB con la paleta de colores.
        """
        try:
            palette : Optional[ColorPalette] = (
                db.session
                    .query(ColorPalette)
                    .options(db.joinedload(ColorPalette.stops))
                    .filter_by(id_palette=id_palette)
                    .first()
            )
            if not palette:
                print(f"[!]{Colors.RED} Palette with id #{id_palette} not found.{Colors.RESET}")
                return {
                    "success"     : False,
                    "error"       : f"Palette with id #{id_palette} not found.",
                    "status_code" : 404
                }
            if self.verbose: print(f"[OK]{Colors.GREEN} FOUND PALETTE:{Colors.RESET}{palette.display_name}")
            return {
                "success"     : True,
                "data"        : palette.to_dict(),
                "status_code" : 200
            }
        except Exception as e:
            raise e

    def create_palette(self : PaletteService, params : dict[str, Any]) -> dict[str, Any]:
        """
        Guarda una nueva paleta de colores en la DB.
        :param params : Datos de la nueva paleta de colores.
        :return       : Datos guardados en la DB para la nueva paleta.
        """

        try:
            display_name : str = normalize_text(params.get("display_name", ""))
            if not display_name: return {
                "success"     : False,
                "error"       : "Display name is required.",
                "status_code" : 400
            }

            user_notes : Optional[str]        = normalize_text(params.get("user_notes", "")) or None
            stops_raw  : list[dict[str, Any]] = params.get("stops", [])

            if len(stops_raw) < 2: return {
                "success"     : False,
                "error"       : "A palette must have at least 2 stops.",
                "status_code" : 400
            }

            slug : str = (
                f"{sanitize_filename(display_name)}_{int(perf_counter() * 1000) % 100000}"
                if display_name else f"spectrum_{int(perf_counter() * 1000)}"
            )

            palette : ColorPalette = ColorPalette(
                name         = slug,
                display_name = display_name,
                user_notes   = user_notes,
                is_system    = False,
                is_favorite  = params.get("is_favorite", "false") in ("true", "yes", "1")
            )
            db.session.add(palette)
            db.session.flush()

            for s in stops_raw:
                stop : PaletteStop = PaletteStop(
                    id_palette    = palette.id_palette,
                    stop_position = float(s["stop_position"]),
                    r             = int(s["r"]),
                    g             = int(s["g"]),
                    b             = int(s["b"])
                )
                db.session.add(stop)

            db.session.commit()
            self.invalidate_lut_cache(palette.id_palette)

            print(f"[OK]{Colors.GREEN} SUCCESSFULLY CREATED PALETTE: {Colors.RESET}{palette.name}")

            return {
                "success"     : True,
                "data"        : palette.to_dict(),
                "status_code" : 201
            }

        except Exception as e:
            db.session.rollback()
            raise e

    def update_palette(self : PaletteService, id_palette : int, params : dict[str, Any]) -> dict[str, Any]:
        """
        Actualiza una paleta de colores existente.
        :param id_palette : ID de la paleta de colores.
        :param params     : Datos nuevos.
        :return           : Datos de la paleta en la DB.
        """
        try:
            palette : Optional[ColorPalette] = (
                db.session
                    .query(ColorPalette)
                    .options(db.joinedload(ColorPalette.stops))
                    .filter_by(id_palette=id_palette)
                    .first()
            )
            if not palette:
                print(f"[!]{Colors.RED} PALETTE {id_palette} NOT FOUND{Colors.RESET}")
                return {
                    "success"     : False,
                    "error"       : f"Palette #{id_palette} not found.",
                    "status_code" : 404
                }
            if palette.is_system:
                print(f"[!]{Colors.MAGENTA}Mala abi. No cambies las paletas del sistema{Colors.RESET} >:(")
                return {
                    "success"     : False,
                    "error"       : "Mala abi. No cambies las paletas del sistema >:(",
                    "status_code" : 403
                }

            status_code    : int       = 200
            msg_parts      : list[str] = []
            stops_modified : bool      = False

            if "display_name" in params:
                display_name   : str = normalize_text(params["display_name"])
                if display_name != palette.display_name:
                    status_code : int = 201
                    msg_parts.append(f"Name changed from {palette.display_name} to {display_name}.")
                    palette.display_name = display_name
            if "user_notes" in params:
                user_notes : str = normalize_text(params["user_notes"])
                if user_notes != palette.user_notes:
                    status_code : int = 201
                    msg_parts.append("User notes updated.")
                    palette.user_notes = user_notes

            stops_raw : Optional[list[dict[str, Any]]] = params.get("stops")
            if stops_raw is not None:
                if len(stops_raw) < 2: return {
                    "success"     : False,
                    "error"       : "Palettes must have at least two stops.",
                    "status_code" : 400
                }

                if not self._are_palettes_equal(palette.stops, stops_raw):
                    for old_stop in list(palette.stops):
                        db.session.delete(old_stop)

                    for s in stops_raw:
                        new_stop : PaletteStop = PaletteStop(
                            id_palette    = palette.id_palette,
                            stop_position = float(s["stop_position"]),
                            r             = int(s["r"]),
                            g             = int(s["g"]),
                            b             = int(s["b"])
                        )
                        db.session.add(new_stop)

                    stops_modified : bool = True
                    status_code    : int = 201
                    msg_parts.append("Palette updated.")

            if status_code == 201:
                db.session.commit()
                if stops_modified:
                    self.invalidate_lut_cache(palette.id_palette)

            message : str = " ".join(msg_parts) if msg_parts else "No changes were made."
            print(f"[OK]{Colors.GREEN}{message}{Colors.RESET}")

            return {
                "success"     : True,
                "message"     : message,
                "data"        : palette.to_dict(),
                "status_code" : status_code
            }

        except Exception as e:
            db.session.rollback()
            raise e

    def toggle_favorite(self : PaletteService, id_palette : int) -> dict[str, Any]:
        """
        Alterna el estado de favorito de una paleta de colores.
        :param id_palette : ID de la paleta de colores a alterar.
        :return           : Datos actualizados de la paleta en la DB.
        """
        try:
            palette : Optional[ColorPalette] = (
                db.session
                    .query(ColorPalette)
                    .filter_by(id_palette=id_palette)
                    .first()
            )
            if not palette:
                print(f"[!]{Colors.RED} PALETTE #{id_palette} NOT FOUND.{Colors.RESET}")
                return {
                    "success"     : False,
                    "error"       : f"Palette #{id_palette} not found.",
                    "status_code" : 404
                }

            palette.is_favorite = not bool(palette.is_favorite)
            db.session.commit()

            if self.verbose: print(f"[OK]{Colors.GREEN} PALETTE {palette.display_name} FAVORITE STATUS UPDATED TO {palette.is_favorite}.{Colors.RESET}")

            return {
                "success"     : True,
                "message"     : f"Palette {palette.display_name} favorite status updated to {palette.is_favorite}.",
                "data"        : palette.to_dict(),
                "status_code" : 201
            }
        except Exception as e:
            db.session.rollback()
            raise e

    def delete_palette(self : PaletteService, id_palette : int):
        """
        Elimina una paleta de colores de la DB.
        :param id_palette : ID de la paleta de colores a eliminar.
        :return           : Estado de éxito de la operación.
        """
        try:
            palette : Optional[ColorPalette] = (
                db.session
                    .query(ColorPalette)
                    .filter_by(id_palette=id_palette)
                    .first()
            )
            if not palette:
                print(f"[!]{Colors.RED}PALETTE #{id_palette} NOT FOUND{Colors.RESET}")
                return {
                    "success"     : False,
                    "error"       : f"Palette #{id_palette} not found.",
                    "status_code" : 404
                }

            if palette.is_system:
                print(f"[!]{Colors.MAGENTA}Mala abi. No borres las paletas del sistema{Colors.RESET} >:(")
                return {
                    "success"     : False,
                    "error"       : "Mala abi. No borres las paletas del sistema >:(",
                    "status_code" : 403
                }

            palette_name : str = palette.display_name

            db.session.delete(palette)
            db.session.commit()
            self.invalidate_lut_cache(id_palette)

            print(f"PALETTE {palette_name} (#{id_palette}) SUCCESSFULLY PURGED")

            return {
                "success"     : True,
                "message"     : f"Palette {palette_name} (#{id_palette}) successfully purged",
                "status_code" : 200
            }
        except Exception as e:
            db.session.rollback()
            raise e

    # --- COLORING ---
    def _get_palette_lut(self : PaletteService, palette : ColorPalette) -> np.ndarray:
        """
        Wrapper para el algoritmo que construye una LUT de 256x3 (RGB uint8) para una paleta de colores.
        :param palette : Fila de la DB con la paleta de colores.
        :return        : Arreglo NumPy 256x3 tipo uint8.
        """
        if palette.id_palette in self._lut_cache: return self._lut_cache[palette.id_palette]
        sorted_stops  : list[PaletteStop] = sorted(palette.stops, key=lambda s : float(s.stop_position))
        lut : np.ndarray = self.interpolation_model.interpolate_palette([s.to_dict() for s in sorted_stops])
        self._lut_cache[palette.id_palette] = lut
        return lut

    def invalidate_lut_cache(self : PaletteService, id_palette : Optional[int] = None) -> dict[str, Any]:
        """
        Helper para ignorar el cache de LUTs cuando se edita una paleta de colores.
        :param id_palette : ID de la paleta editada o None para limpiar t0do el caché.
        """
        try:
            if id_palette is None:
                message : str = "All palettes cache has been wiped."
                self._lut_cache.clear()
            else:
                message : str = "Palette was not cached"
                if id_palette in self._lut_cache:
                    self._lut_cache.pop(id_palette, None)
                    message : str = f"Palette ID #{id_palette} cache has been cleared."
            return {
                "success"     : True,
                "message"     : message,
                "status_code" : 200
            }
        except Exception as e:
            raise e

    def apply_palette(self : PaletteService, grayscale_img : Image.Image, palette : ColorPalette) -> dict[str, Any]:
        """
        Mapea una matriz de concentración V a una imagen RGB uint8.
        :param grayscale_img : Imagen en escala de grises.
        :param palette       : Objeto de la DB con la paleta de colores a aplicar.
        :return              : Imagen coloreada con la paleta de colores.
        """
        try:
            if grayscale_img.mode != "L": grayscale_img : Image.Image = grayscale_img.convert("L")
            lut        : np.ndarray = self._get_palette_lut(palette)
            gray_array : np.ndarray = np.asarray(grayscale_img, dtype=np.uint8)
            rgb_array  : np.ndarray = lut[gray_array]
            return {
                "success"     : True,
                "data"        : Image.fromarray(rgb_array, mode="RGB"),
                "status_code" : 200
            }
        except Exception as e:
            raise e
