# Vespera/app/modules/turing/application/vault_service.py

from __future__ import annotations

from typing import Optional, Any

from app.core.extensions import db
from app.core.config import Colors
from app.core.utils.text_utils import normalize_text
from app.infrastructure.repositories.models import SourceImage, ConfigTuring, SynthesisArtifact

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
            palette        : Optional[str] = normalize_text(params["palette"], "LOWER") if params.get("palette") else None
            only_favorites : bool          = normalize_text(params.get("favorites", ""), "LOWER")== "true"
            search_query   : Optional[str] = str(params["search"]).replace("  ", " ").strip() if params.get("search") else None
            page           : int           = max(1, int(params.get("page", 1)))
            per_page       : int           = max(1, min(100, int(params.get("per_page", 24))))

            query = (
                db.session
                    .query(SynthesisArtifact)
                    .options(
                        db.joinedload(SynthesisArtifact.source_image),
                        db.joinedload(SynthesisArtifact.turing_config),
                        db.joinedload(SynthesisArtifact.parent_artifact)
                    )
            )

            if only_favorites:
                query = query.filter(SynthesisArtifact.is_favorite == True)

            if palette and palette != "all":
                query = (
                    query
                        .join(ConfigTuring, ConfigTuring.id_config == SynthesisArtifact.id_config)
                        .filter(ConfigTuring.color_palette == palette)
                )

            if search_query:
                search_term : str = f"%{search_query}%"
                query = (
                    query
                        .join(SourceImage, SourceImage.id_source_image == SynthesisArtifact.id_source_image)
                        .filter(
                            SourceImage.original_filename.ilike(search_term) |
                            SynthesisArtifact.user_notes.ilike(search_term)  |
                            SynthesisArtifact.artifact_hash.ilike(search_term)
                        )
                )

            total_items : int = query.count()

            artifacts : list[SynthesisArtifact] = (
                query
                    .order_by(SynthesisArtifact.id_artifact.desc())
                    .offset((page-1) * per_page)
                    .limit(per_page)
                    .all()
            )

            results : list[dict[str, Any]] = [a.to_dict() for a in artifacts]

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
            if isinstance(raw_flag, bool):
                delete_orphaned_source : bool = raw_flag
            else:
                delete_orphaned_source : bool = str(raw_flag).lower() in ("true", "yes", "1")

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
                print(f"[!] {Colors.RED}Error deleting artifact file:{Colors.RESET} {ex}")
                msg_parts.append(f"Error deleting artifact file.")

            # Eliminar registro de la DB
            db.session.delete(artifact)
            db.session.commit()

            if self.verbose:
                print(f"[OK]{Colors.YELLOW} Artifact #{id_artifact} deleted successfully.{Colors.RESET}")
            msg_parts.append(f"Artifact #{id_artifact} deleted successfully.")

            # Eliminar imagen original huérfana
            if delete_orphaned_source:
                try:
                    source_res : dict[str, Any] = self.delete_source_image(source_image_id)
                    if not source_res.get("success"):
                        print(f"[!] {Colors.RED}Error deleting source image:{Colors.RESET} {source_res.get('error', 'Unknown error')}")
                        msg_parts.append(f"Error deleting source image #{source_image_id}.")
                    else:
                        if self.verbose:
                            print(f"[OK]{Colors.YELLOW} Source image #{source_image_id} deleted successfully.{Colors.RESET}")
                        msg_parts.append(f"Source image #{source_image_id} deleted successfully.")
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

