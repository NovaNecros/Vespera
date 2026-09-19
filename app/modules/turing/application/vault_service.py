# Vespera/app/modules/turing/application/vault_service.py

from __future__ import annotations

from typing import Optional, Any, Union

from app.core.extensions import db
from app.core.config import Colors
from app.core.utils.text_utils import normalize_text
from app.infrastructure.repositories.models import (
    SourceImage,  SynthesisArtifact,
    ColorPalette, ConfigTuring
)

from app.infrastructure.repositories.files_repo import FileRepository

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
            id_palette      : Optional[int] = int(params["id_palette"])      if params.get("id_palette")      else None
            id_source_image : Optional[int] = int(params["id_source_image"]) if params.get("id_source_image") else None
            only_favorites  : bool          = normalize_text(params.get("favorites", ""), "LOWER") in ("true", "1", "yes")
            search_query    : Optional[str] = normalize_text(params["search"]) if params.get("search") else None
            sort_by         : str           = normalize_text(str(params.get("sort_by", "date_created")), "LOWER")
            sort_dir        : Optional[str] = normalize_text(str(params.get("sort_dir", "desc")), "LOWER")
            page            : int           = max(1, int(params.get("page", 1)))
            per_page        : int           = max(1, min(100, int(params.get("per_page", 24))))

            query = (
                db.session
                    .query(SynthesisArtifact)
                    .options(
                        db.joinedload(SynthesisArtifact.source_image),
                        db.joinedload(SynthesisArtifact.turing_config).joinedload(ConfigTuring.palette)
                )
            )

            if only_favorites:
                query = query.filter(SynthesisArtifact.is_favorite == True)

            if id_source_image:
                query = query.filter(SynthesisArtifact.id_source_image == id_source_image)

            if id_palette:
                query = (
                    query
                        .join(ConfigTuring, ConfigTuring.id_config == SynthesisArtifact.id_config)
                        .filter(ConfigTuring.id_palette == id_palette)
                )

            if search_query:
                search_term : str = f"%{search_query}%"
                query = (
                    query
                        .join(SourceImage, SourceImage.id_source_image == SynthesisArtifact.id_source_image)
                        .filter(
                            SourceImage.alias.ilike(search_term)               |
                            SynthesisArtifact.alias.ilike(search_term)         |
                            SynthesisArtifact.user_notes.ilike(search_term)    |
                            SynthesisArtifact.artifact_hash.ilike(search_term)
                        )
                )

            sort_map : dict[str, Any] = {
                "date_created"   : SynthesisArtifact.created_at,
                "synthesis_time" : SynthesisArtifact.execution_time,
                "alias"          : SynthesisArtifact.alias
            }
            if sort_dir == "asc":
                order_expr = db.asc(sort_map.get(sort_by, SynthesisArtifact.created_at))
            else:
                order_expr = db.desc(sort_map.get(sort_by, SynthesisArtifact.created_at))

            query = query.order_by(order_expr)

            total_items : int = query.count()

            artifacts : list[SynthesisArtifact] = (
                query
                    .offset((page-1) * per_page)
                    .limit(per_page)
                    .all()
            )

            results : list[dict[str, Any]] = [{
                "id_artifact"        : a.id_artifact,
                "alias"              : a.alias,
                "artifact_hash"      : a.artifact_hash,
                "id_source_image"    : a.id_source_image,
                "id_parent_artifact" : a.id_parent_artifact,
                "seed"               : a.seed,
                "execution_time"     : a.execution_time,
                "is_favorite"        : a.is_favorite,
                "user_notes"         : a.user_notes,
                "created_at"         : a.created_at.isoformat()  if a.created_at    else None,
                "source_image"       : a.source_image.to_dict()  if a.source_image  else None,
                "config"             : a.turing_config.to_dict() if a.turing_config else None
            } for a in artifacts]

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
                        db.joinedload(SynthesisArtifact.turing_config)
                            .joinedload(ConfigTuring.palette)
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
            formatted_detail["children"] = [child.to_dict() for child in children]

            return {
                "success"     : True,
                "data"        : formatted_detail,
                "status_code" : 200
            }

        except Exception as e:
            raise e

    @staticmethod
    def get_hydration_bundle(id_artifact : int) -> dict[str, Any]:
        """
        Recupera los parámetros de un patrón para sembrarlos en el estudio.
        :param id_artifact : ID del artefacto a cargar en el estudio.
        :return            : Información completa del patrón.
        """
        try:
            artifact : Optional[SynthesisArtifact] = (
                db.session
                    .query(SynthesisArtifact)
                    .options(
                        db.joinedload(SynthesisArtifact.source_image),
                        db.joinedload(SynthesisArtifact.turing_config)
                            .joinedload(ConfigTuring.palette)
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
                    "id_palette" : artifact.turing_config.id_palette,
                    "palette"    : artifact.turing_config.palette.to_dict() if artifact.turing_config.palette else None
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
                print(f"[OK]{Colors.GREEN} Found {total_items} catalysts in The Vault.{Colors.RESET}")

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

