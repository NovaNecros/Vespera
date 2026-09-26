# Vespera/app/modules/turing/application/vault_service.py

from __future__ import annotations

from io import BytesIO
from pathlib import Path
from PIL import Image
from typing import Optional, Any, Union

from app.core.extensions import db
from app.core.config import Colors
from app.core.utils.text_utils import normalize_text
from app.infrastructure.models import (
    SourceImage,  SynthesisArtifact,
    ColorPalette, RelArtifactPalette
)

from app.infrastructure.files_repo import FileRepository
from app.modules.spectra.application.palette_service import PaletteService

class VaultService:
    """
    Servicio para la administración, consulta, linaje y depuración
    de los patrones generados e imágenes fuente (CRUDs glorificadas).
    """

    def __init__(self : VaultService, verbose : bool = False) -> None:
        self.verbose : bool = verbose

    def get_vault_gallery(self : VaultService, params : dict[str, Any]) -> dict[str, Any]:
        """
        Recupera la galería de patrones generados según los filtros especificados.
        :param params : Filtros de búsqueda (paleta, favoritos, página, etc.)
        :return       : Lista formateada de patrones encontrados.
        """
        try:
            id_palette      : Optional[int] = (
                int(params["id_palette"])
                if params.get("id_palette") is not None and str(params["id_palette"]).strip() != ""
                else None
            )
            id_source_image : Optional[int] = int(params["id_source_image"])   if params.get("id_source_image") else None
            only_favorites  : bool          = normalize_text(params.get("favorites", ""), "LOWER") in ("true", "1", "yes")
            search_query    : Optional[str] = normalize_text(params["search"]) if params.get("search")          else None
            sort_by         : str           = normalize_text(str(params.get("sort_by", "date_created")), "LOWER")
            sort_dir        : Optional[str] = normalize_text(str(params.get("sort_dir", "desc")), "LOWER")
            page            : int           = max(1, int(params.get("page", 1)))
            per_page        : int           = max(1, min(100, int(params.get("per_page", 24))))

            query = (
                db.session
                    .query(SynthesisArtifact, RelArtifactPalette)
                    .options(
                        db.joinedload(SynthesisArtifact.source_image),
                        db.joinedload(SynthesisArtifact.turing_config),
                        db.joinedload(SynthesisArtifact.palette_rels)
                            .joinedload(RelArtifactPalette.palette)
                            .joinedload(ColorPalette.stops)
                    )
                    .join(SourceImage,             SourceImage.id_source_image    == SynthesisArtifact.id_source_image)
                    .outerjoin(RelArtifactPalette, RelArtifactPalette.id_artifact == SynthesisArtifact.id_artifact)
                    .outerjoin(ColorPalette,       ColorPalette.id_palette        == RelArtifactPalette.id_palette)
            )

            if id_source_image:
                query = query.filter(SynthesisArtifact.id_source_image == id_source_image)

            if only_favorites:
                query = query.filter(SynthesisArtifact.is_favorite == True)

            if id_palette is not None:
                if id_palette == 0 : query = query.filter(RelArtifactPalette.id_rel.is_(None))
                else               : query = query.filter(RelArtifactPalette.id_palette == id_palette)

            if search_query:
                search_term : str = f"%{search_query}%"
                query = query.filter(
                    SourceImage.alias.ilike(search_term)               |
                    SynthesisArtifact.alias.ilike(search_term)         |
                    SynthesisArtifact.user_notes.ilike(search_term)    |
                    SynthesisArtifact.artifact_hash.ilike(search_term)
                )

            sort_map : dict[str, Any] = {
                "date_created"   : SynthesisArtifact.created_at,
                "synthesis_time" : SynthesisArtifact.execution_time,
                "alias"          : SynthesisArtifact.alias
            }

            sort_col   = sort_map.get(sort_by, SynthesisArtifact.created_at)
            order_expr = db.asc(sort_col) if sort_dir == "asc" else db.desc(sort_col)
            query      = query.order_by(order_expr)

            total_items : int = query.count()

            rows : list[tuple[SynthesisArtifact, Optional[RelArtifactPalette]]] = (
                query
                    .offset((page-1) * per_page)
                    .limit(per_page)
                    .all()
            )

            results : list[dict[str, Any]] = []
            for art, rel in rows:
                if not art: continue
                results.append({
                    "id_rel"             : rel.id_rel if rel else 0,
                    "id_artifact"        : art.id_artifact,
                    "alias"              : art.alias,
                    "artifact_hash"      : art.artifact_hash,
                    "id_source_image"    : art.id_source_image,
                    "id_parent_artifact" : art.id_parent_artifact,
                    "seed"               : art.seed,
                    "execution_time"     : float(art.execution_time),
                    "is_favorite"        : bool(art.is_favorite),
                    "user_notes"         : art.user_notes,
                    "palette"            : rel.palette.to_dict()       if rel and rel.palette else None,
                    "created_at"         : art.created_at.isoformat()  if art.created_at      else None,
                    "source_image"       : art.source_image.to_dict()  if art.source_image    else None,
                    "config"             : art.turing_config.to_dict() if art.turing_config   else None
                })

            if self.verbose:
                print(f"[OK]{Colors.GREEN} Vault gallery fetched: {len(results)}/{total_items} items{Colors.RESET}")

            return {
                "success"     : True,
                "data"        : {
                    "items"       : results,
                    "total_items" : total_items,
                    "page"        : page,
                    "per_page"    : per_page,
                    "total_pages" : (total_items+per_page-1) // per_page
                },
                "status_code" : 200
            }
        except Exception as e:
            raise e

    @staticmethod
    def get_artifact_detail(id_artifact : int) -> dict[str, Any]:
        """
        Obtiene el registro de la DB de un patrón de Turing y de sus patrones derivados.
        :param id_artifact : ID (PK) del patrón de turing.
        :return            : Datos encontrados en la DB.
        """
        try:
            artifact : Optional[SynthesisArtifact] = (
                db.session
                    .query(SynthesisArtifact)
                    .options(
                        db.joinedload(SynthesisArtifact.source_image),
                        db.joinedload(SynthesisArtifact.turing_config),
                        db.joinedload(SynthesisArtifact.palette_rels)
                            .joinedload(RelArtifactPalette.palette)
                            .joinedload(ColorPalette.stops),
                        db.joinedload(SynthesisArtifact.frames),
                        db.joinedload(SynthesisArtifact.parent_artifact)
                    )
                    .filter_by(id_artifact=id_artifact)
                    .first()
            )

            if not artifact: return {
                "success"     : False,
                "error"       : f"Turing Pattern with ID #{id_artifact} not found in DB.",
                "status_code" : 404
            }

            children : list[SynthesisArtifact] = (
                db.session
                    .query(SynthesisArtifact)
                    .filter_by(id_parent_artifact=id_artifact)
                    .order_by(SynthesisArtifact.id_artifact.asc())
                    .all()
            )

            formatted_detail : dict[str, Any] = artifact.to_dict()
            formatted_detail["children"]       = [child.to_dict() for child in children]
            formatted_detail["manifestations"] = [{
                "id_rel"     : r.id_rel,
                "id_palette" : r.id_palette,
                "palette"    : r.palette.to_dict() if r.palette else None,
                "created_at" : r.created_at.isoformat() if r.created_at else None
            } for r in artifact.palette_rels]

            return {
                "success"     : True,
                "data"        : formatted_detail,
                "status_code" : 200
            }

        except Exception as e:
            raise e

    @staticmethod
    def get_hydration_bundle(id_artifact : int, id_palette : Optional[int] = None) -> dict[str, Any]:
        """
        Recupera los parámetros de un patrón para sembrarlos en el estudio.
        :param id_artifact : ID del artefacto a cargar en el estudio.
        :param id_palette  : ID de la paleta para aplicar al patrón.
        :return            : Información completa del patrón.
        """
        try:
            artifact : Optional[SynthesisArtifact] = (
                db.session
                    .query(SynthesisArtifact)
                    .options(
                        db.joinedload(SynthesisArtifact.source_image),
                        db.joinedload(SynthesisArtifact.turing_config),
                        db.joinedload(SynthesisArtifact.palette_rels)
                            .joinedload(RelArtifactPalette.palette)
                            .joinedload(ColorPalette.stops),
                        db.joinedload(SynthesisArtifact.frames)
                    )
                    .filter_by(id_artifact=id_artifact)
                    .first()
            )

            if not artifact: return {
                "success"     : False,
                "error"       : f"Artifact #{id_artifact} not found in The Vault",
                "status_code" : 404
            }

            selected_pal : Optional[ColorPalette] = None
            if id_palette and id_palette > 0:
                selected_pal : Optional[ColorPalette] = next(
                    (r.palette for r in artifact.palette_rels if r.id_palette == id_palette), None)
            if not selected_pal and artifact.palette_rels:
                selected_pal : ColorPalette = artifact.palette_rels[0].palette

            frame_stream_urls : list[str] = [
                f"/vault/api/stream/artifact/hash/{artifact.artifact_hash}/frame/{frame.frame_index}"
                for frame in sorted(artifact.frames, key=lambda f : f.frame_index)
            ]

            bundle : dict[str, Any] = {
                "id_artifact"        : artifact.id_artifact,
                "alias"              : artifact.alias,
                "artifact_hash"      : artifact.artifact_hash,
                "parent_artifact_id" : artifact.id_artifact,
                "user_notes"         : artifact.user_notes or "",
                "source_image"       : {
                    "id_source_image" : artifact.source_image.id_source_image,
                    "alias"           : artifact.source_image.alias,
                    "sha256_hash"     : artifact.source_image.sha256_hash,
                    "width"           : artifact.source_image.width,
                    "height"          : artifact.source_image.height,
                    "stream_url"      : f"/vault/api/stream/source/hash/{artifact.source_image.sha256_hash}"
                } if artifact.source_image else None,
                "config"             : {
                    "id_config"  : artifact.turing_config.id_config,
                    "feed_rate"  : float(artifact.turing_config.feed_rate),
                    "kill_rate"  : float(artifact.turing_config.kill_rate),
                    "diff_u"     : float(artifact.turing_config.diff_u),
                    "diff_v"     : float(artifact.turing_config.diff_v),
                    "dt"         : float(artifact.turing_config.dt),
                    "iterations" : artifact.turing_config.iterations,
                    "id_palette" : selected_pal.id_palette if selected_pal else 0,
                    "palette"    : selected_pal.to_dict()  if selected_pal else None
                } if artifact.turing_config else None,
                "frames"             : frame_stream_urls,
                "frame_count"        : len(frame_stream_urls)
            }

            return {
                "success"     : True,
                "data"        : bundle,
                "status_code" : 200
            }

        except Exception as e:
            raise e

    @staticmethod
    def get_colored_artifact_download(id_rel : int) -> dict[str, Any]:
        """
        Aplica color a un patrón de Turing y lo envía para descargar.
        :param id_rel : ID de la relación entre el patrón y la paleta.
        :return       : Diccionario con el buffer, mimetype y nombre de la descarga.
        """
        try:
            rel : Optional[RelArtifactPalette] = (
                db.session
                    .query(RelArtifactPalette)
                    .options(
                        db.joinedload(RelArtifactPalette.artifact),
                        db.joinedload(RelArtifactPalette.palette).joinedload(ColorPalette.stops)
                    )
                    .filter_by(id_rel=id_rel)
                    .first()
            )
            if not rel or not rel.artifact or not rel.palette: return {
                "success"     : False,
                "error"       : f"Relationship #{id_rel} was not found",
                "status_code" : 404
            }

            raw_path : Path = FileRepository.get_artifact_path(rel.artifact.artifact_hash)
            if not raw_path.exists(): return {
                "success"     : False,
                "error"       : f"Image {raw_path} file not found in disk.",
                "status_code" : 404
            }

            palette_service : PaletteService = PaletteService()
            with Image.open(raw_path) as gray_img:
                color_res : dict[str, Any] = palette_service.apply_palette(gray_img, rel.palette)
                if not color_res.get("success"): return {
                    "success"     : False,
                    "error"       : color_res.get("error", "Unknown error applying palette to image."),
                    "status_code" : color_res.get("status_code", 500)
                }

                colored_img : Image.Image = color_res["data"]
                buffer      : BytesIO     = BytesIO()
                colored_img.save(buffer, format="PNG", optimize=True)
                buffer.seek(0)

            img_alias : str = normalize_text(rel.artifact.alias, "LOWER")
            img_alias : str = img_alias if img_alias.endswith(".png") else f"{img_alias}.png"

            return {
                "success"     : True,
                "data"        : {
                    "buffer"        : buffer,
                    "mimetype"      : "image/png",
                    "download_name" : img_alias
                },
                "status_code" : 200
            }

        except Exception as e:
            raise e

    @staticmethod
    def add_artifact_palette(id_artifact : int, id_palette : int) -> dict[str, Any]:
        """
        Crea una relación entre un artefacto y una paleta de colores.
        :param id_artifact : ID del artefacto.
        :param id_palette  : ID de la paleta.
        :return            : Relación en la DB.
        """
        try:
            artifact : Optional[SynthesisArtifact] = (
                db.session
                    .query(SynthesisArtifact)
                    .filter_by(id_artifact=id_artifact)
                    .first()
            )
            if not artifact: return{
                "success"     : False,
                "error"       : f"Artifact #{id_artifact} not found",
                "status_code" : 404
            }

            palette : Optional[ColorPalette] = (
                db.session
                    .query(ColorPalette)
                    .filter_by(id_palette=id_palette)
                    .first()
            )
            if not palette: return {
                "success"     : False,
                "error"       : f"Color Palette #{id_palette} not found",
                "status_code" : 404
            }

            existing_rel : Optional[RelArtifactPalette] = (
                db.session
                    .query(RelArtifactPalette)
                    .filter_by(id_artifact=id_artifact, id_palette=id_palette)
                    .first()
            )
            if existing_rel: return {
                "success"     : True,
                "message"     : f"Relationship between Artifact {artifact.alias} and Palette #{palette.display_name} already exists.",
                "data"        : existing_rel.to_dict(),
                "status_code" : 200
            }

            new_rel : RelArtifactPalette = RelArtifactPalette(id_artifact=id_artifact, id_palette=id_palette)
            db.session.add(new_rel)
            db.session.commit()

            print(f"[OK]{Colors.GREEN} BOUND SPECTRUM {palette.display_name} TO ARTIFACT #{artifact.alias} SUCCESSFULLY {Colors.RESET}")

            return {
                "success"     : True,
                "message"     : f"Spectrum {palette.display_name} bound to artifact {artifact.alias}",
                "data"        : new_rel.to_dict(),
                "status_code" : 201
            }
        except Exception as e:
            db.session.rollback()
            raise e

    @staticmethod
    def update_alias(
        target_type : str,
        target_id   : int,
        params      : dict[str, Any]
    ) -> dict[str, Any]:
        """
        Actualiza el alias de una imagen o patrón en la DB.
        :param target_type : Tipo de entidad a actualizar.
        :param target_id   : ID (PK) de la entidad.
        :param params      : Nuevo alias.
        :return            : Estado de éxito de la operación.
        """
        try:
            normalized_type : str = normalize_text(target_type, "LOWER")
            if normalized_type not in ("artifact", "source"): return {
                "success"     : False,
                "error"       : f"Invalid target type {target_type}. Must be 'artifact' or 'source'.",
                "status_code" : 400
            }

            new_alias : str = normalize_text(str(params.get("alias", "")), "LOWER")
            if not new_alias: return {
                "success"     : False,
                "error"       : "An artifact cannot bear a void inscription",
                "status_code" : 400
            }

            # Polimorfismo at home :b
            model_cls = SynthesisArtifact             if normalized_type == "artifact" else SourceImage
            pk_field  = SynthesisArtifact.id_artifact if normalized_type == "artifact" else SourceImage.id_source_image

            row : Optional[Union[SynthesisArtifact, SourceImage]] = (
                db.session
                    .query(model_cls)
                    .filter(pk_field == target_id)
                    .first()
            )
            if not row: return {
                "success"     : False,
                "error"       : f"{normalized_type.capitalize()} #{target_id} not found in The Vault.",
                "status_code" : 404
            }

            original_alias : str = row.alias
            status_code    : int = 200
            message        : str = "No changes were made."
            if new_alias != original_alias:
                row.alias = new_alias
                db.session.commit()
                message     : str = f"{normalized_type.capitalize()} #{target_id} alias updated successfully."
                status_code : int = 201

            return {
                "success"     : True,
                "message"     : message,
                "data"        : {
                    "target_type"    : normalized_type,
                    "target_id"      : target_id,
                    "original_alias" : original_alias,
                    "new_alias"      : row.alias,
                },
                "status_code" : status_code
            }
        except Exception as e:
            db.session.rollback()
            raise e

    @staticmethod
    def toggle_favorite(id_artifact : int) -> dict[str, Any]:
        """
        Alterna el estado de favorito de un patrón de Turing.
        :param id_artifact : ID (PK) del patrón de Turing.
        :return            : Estado de éxito de la operación.
        """
        try:
            artifact : Optional[SynthesisArtifact] = (
                db.session
                    .query(SynthesisArtifact)
                    .filter_by(id_artifact=id_artifact)
                    .first()
            )

            if not artifact: return {
                "success"     : False,
                "error"       : f"Artifact #{id_artifact} not found.",
                "status_code" : 404
            }

            artifact.is_favorite = not bool(artifact.is_favorite)
            db.session.commit()

            return {
                "success"     : True,
                "message"     : f"Artifact favorite status updated to {artifact.is_favorite}.",
                "data"        : {
                    "id_artifact" : artifact.id_artifact,
                    "is_favorite" : artifact.is_favorite
                },
                "status_code" : 201
            }

        except Exception as e:
            db.session.rollback()
            raise e

    @staticmethod
    def update_notes(id_artifact : int, params : dict[str, Any]) -> dict[str, Any]:
        """
        Actualiza las notas personales de un patrón de Turing.
        """
        try:
            artifact : Optional[SynthesisArtifact] = (
                db.session
                    .query(SynthesisArtifact)
                    .filter_by(id_artifact=id_artifact)
                    .first()
            )

            if not artifact: return {
                "success"     : False,
                "error"       : f"Artifact #{id_artifact} not found.",
                "status_code" : 404
            }

            notes_text : str = str(params.get("user_notes", "")).replace("  ", " ").strip()
            if notes_text == artifact.user_notes:
                message     : str = "No changes were made."
                status_code : int = 200
            else:
                artifact.user_notes = notes_text if notes_text else None
                message     : str = "Notes updated successfully."
                status_code : int = 201
                db.session.commit()

            return {
                "success"     : True,
                "message"     : message,
                "data"        : {
                    "id_artifact" : artifact.id_artifact,
                    "user_notes"  : artifact.user_notes
                },
                "status_code" : status_code
            }

        except Exception as e:
            db.session.rollback()
            raise e

    def get_sources_catalog(self : VaultService, params : dict[str, Any]) -> dict[str, Any]:
        """
        Recupera el catálogo de imágenes originales junto con el número de patrones asociados.
        :param params : Parámetros de búsqueda.
        :return       : Lista de imágenes originales.
        """
        try:
            search_query : Optional[str] = normalize_text(str(params["search"])) if params.get("search") else None
            page         : int           = max(1, int(params.get("page", 1)))
            per_page     : int           = max(1, min(48, int(params.get("per_page", 16))))

            artifact_count_subquery = (
                db.session
                    .query(
                        SynthesisArtifact.id_source_image,
                        db.func.count(SynthesisArtifact.id_artifact).label("artifact_count"),
                        db.func.max(SynthesisArtifact.id_artifact).label("latest_artifact_id")
                    )
                    .group_by(SynthesisArtifact.id_source_image)
                    .subquery()
            )

            query = (
                db.session
                    .query(
                        SourceImage,
                        db.func.coalesce(artifact_count_subquery.c.artifact_count, 0).label("artifact_count"),
                        artifact_count_subquery.c.latest_artifact_id
                    )
                    .outerjoin(
                        artifact_count_subquery,
                        SourceImage.id_source_image == artifact_count_subquery.c.id_source_image
                    )
            )

            if search_query: query = query.filter(SourceImage.alias.ilike(f"%{search_query}%"))

            query = query.order_by(SourceImage.created_at.desc())
            total_items : int = query.count()

            # Paginación
            rows : list[tuple[SourceImage, int, int]] = query.offset((page - 1) * per_page).limit(per_page).all()

            # Previews
            latest_artifact_ids : list[int] = [r[2] for r in rows if r[2] is not None]
            latest_hash_map : dict[int, str] = {}
            if latest_artifact_ids:
                hash_rows : list[tuple[int, str]] = (
                    db.session
                        .query(SynthesisArtifact.id_artifact, SynthesisArtifact.artifact_hash)
                        .filter(SynthesisArtifact.id_artifact.in_(latest_artifact_ids))
                        .all()
                )
                latest_hash_map : dict[int, str] = {r[0]: r[1] for r in hash_rows}

            results : list[dict[str, Any]] = []
            for source, count, latest_id in rows:
                latest_hash : Optional[str] = latest_hash_map.get(latest_id) if latest_id else None
                results.append({
                    "id_source_image"   : source.id_source_image,
                    "sha256_hash"       : source.sha256_hash,
                    "alias"             : source.alias,
                    "width"             : source.width,
                    "height"            : source.height,
                    "file_size_bytes"   : source.file_size_bytes,
                    "artifact_count"    : int(count),
                    "latest_hash"       : latest_hash,
                    "latest_thumb_url"  : f"/vault/api/stream/thumbnail/hash/{latest_hash}" if latest_hash else None,
                    "source_stream_url" : f"/vault/api/stream/source/hash/{source.sha256_hash}",
                    "created_at"        : source.created_at.isoformat() if source.created_at else None
                })

            if self.verbose:
                # print(f"[OK]{Colors.GREEN} Found {total_items} catalysts in The Vault.{Colors.RESET}")
                pass

            return {
                "success"   : True,
                "data"      : {
                    "items"       : results,
                    "total_items" : total_items,
                    "page"        : page,
                    "per_page"    : per_page,
                    "total_pages" : (total_items + per_page - 1) // per_page
                },
                "status_code" : 200
            }
        except Exception as e:
            raise e

    @staticmethod
    def get_orphaned_sources() -> dict[str, Any]:
        """
        Recupera todas las imágenes originales sin patrones de Turing asociados para el cementerio.
        :return : Lista de imágenes huérfanas.
        """
        try:
            orphaned_sources : list[SourceImage] = (
                db.session
                    .query(SourceImage)
                    .filter(~SourceImage.artifacts.any())
                    .order_by(SourceImage.id_source_image)
                    .all()
            )

            results : list[dict[str, Any]] = [img.to_dict() for img in orphaned_sources]
            return {
                "success"     : True,
                "data"        : {
                    "items" : results,
                    "count" : len(results)
                },
                "status_code" : 200
            }
        except Exception as e:
            raise e

    def delete_source_image(self : VaultService, id_source_image : int) -> dict[str, Any]:
        """
        Elimina una imagen original que ha quedado huérfana de la DB y físicamente.
        :param id_source_image : ID (PK) de la imagen original.
        :return                : Estado de éxito de la operación.
        """
        try:
            source : Optional[SourceImage] = (
                db.session
                    .query(SourceImage)
                    .filter_by(id_source_image=id_source_image)
                    .first()
            )
            if not source: return {
                "success"     : False,
                "error"       : f"Source image with ID #{id_source_image} not found.",
                "status_code" : 404
            }

            active_artifacts_count : int = (
                db.session
                    .query(SynthesisArtifact)
                    .filter_by(id_source_image=id_source_image)
                    .count()
            )
            if active_artifacts_count > 0: return {
                "success"     : False,
                "error"       : f"Requested source image with ID #{id_source_image} has {active_artifacts_count} associated artifacts.",
                "status_code" : 409
            }

            try:
                FileRepository.delete_orphaned_source_file(source.sha256_hash)
            except Exception as ex:
                print(f"[!] {Colors.RED}Error deleting source file:{Colors.RESET} {ex}")

            db.session.delete(source)
            db.session.commit()

            if self.verbose:
                print(f"[OK]{Colors.GREEN} Successfully deleted source image with ID:{Colors.RESET} #{id_source_image}")

            return {
                "success"     : True,
                "message"     : f"Source image with ID #{id_source_image} deleted successfully.",
                "status_code" : 200
            }

        except Exception as e:
            db.session.rollback()
            raise e

    @staticmethod
    def delete_palette_relation(id_rel : int) -> dict[str, Any]:
        """
        Elimina una relación entre un patrón de Turing y una paleta de colores.
        :param id_rel : ID (PK) de la relación.
        :return       : Estado de éxito de la operación.
        """
        try:
            rel : Optional[RelArtifactPalette] = (
                db.session
                    .query(RelArtifactPalette)
                    .filter_by(id_rel=id_rel)
                    .first()
            )
            if not rel: return {
                "success"     : False,
                "error"       : f"Relationship #{id_rel} not found in DB",
                "status_code" : 404
            }

            id_artifact : int = rel.id_artifact
            id_palette  : int = rel.id_palette
            db.session.delete(rel)
            db.session.commit()

            print(f"[OK]{Colors.YELLOW} RELATION #{id_rel} BETWEEN ARTIFACT #{id_artifact} AND PALETTE #{id_palette} DELETED{Colors.RESET}")

            return {
                "success"     : True,
                "message"     : f"Manifestation #{id_rel} purged from The Reliquary",
                "status_code" : 200
            }
        except Exception as e:
            db.session.rollback()
            raise e

    def delete_artifact(
        self        : VaultService,
        id_artifact : int,
        params      : dict[str, Any]
    ) -> dict[str, Any]:
        """
        Elimina un patrón de turing de la DB y sus archivos físicos asociados.
        Si la imagen original queda huérfana, se elimina también.
        :param id_artifact : ID (PK) del patrón de Turing.
        :param params      : Bandera para indicar si preservar o eliminar la imagen original si queda huérfana.
        :return            : Estado de éxito de la operación.
        """
        try:
            raw_flag : Any = params.get("delete_orphaned_source", False)
            delete_orphaned_source : bool = (
                raw_flag if isinstance(raw_flag, bool)
                else normalize_text(raw_flag, "LOWER") in ("true", "yes", "1")
            )

            msg_parts : list[str] = []

            artifact : Optional[SynthesisArtifact] = (
                db.session
                    .query(SynthesisArtifact)
                    .filter_by(id_artifact=id_artifact)
                    .first()
            )
            if not artifact: return {
                "success"     : False,
                "error"       : f"Artifact with ID {id_artifact} not found.",
                "status_code" : 404
            }

            artifact_hash   : str = artifact.artifact_hash
            source_image_id : int = artifact.id_source_image

            # Eliminar archivos del patrón
            try:
                FileRepository.delete_artifact_files(artifact_hash)
            except Exception as ex:
                print(f"[!] {Colors.RED}Error deleting artifact files:{Colors.RESET} {ex}")
                msg_parts.append(f"Warning: Could not remove all artifact files.")

            # Eliminar registro de la DB
            db.session.delete(artifact)
            db.session.commit()

            if self.verbose:
                print(f"[OK]{Colors.YELLOW} Artifact #{id_artifact} purged successfully.{Colors.RESET}")
            msg_parts.append(f"Artifact #{id_artifact} deleted successfully.")

            # Eliminar imagen original huérfana
            if delete_orphaned_source:
                try:
                    remaining_siblings : int = (
                        db.session
                            .query(SynthesisArtifact)
                            .filter_by(id_source_image=source_image_id)
                            .count()
                    )
                    if remaining_siblings == 0:
                        self.delete_source_image(source_image_id)
                        msg_parts.append(f"Orphaned catalyst #{source_image_id} also purged")
                    else:
                        msg_parts.append(f"Catalyst #{source_image_id} was not orphaned ({remaining_siblings} children remain)")
                except Exception as ex:
                    print(f"[!] {Colors.RED}Unexpected error deleting source image:{Colors.RESET} {ex}")
                    msg_parts.append(f"Unexpected error deleting source image #{source_image_id}.")

            return {
                "success"     : True,
                "message"     : " ".join(msg_parts),
                "status_code" : 200
            }

        except Exception as e:
            db.session.rollback()
            raise e

