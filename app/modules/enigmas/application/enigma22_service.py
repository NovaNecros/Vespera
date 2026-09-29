# Vespera/app/modules/enigmas/application/enigma22_service.py

from __future__ import annotations

from typing import Any, Optional
from datetime import datetime, timezone

from app.core.extensions import db
from app.core.config import Colors
from app.core.utils.cryptography_utils import compute_solution_sha512
from app.infrastructure.models import (
    EnigmaQuest,  SynthesisArtifact,
    ColorPalette
)

class Enigma22Service:
    """
    Servicio con el enigma para tu cumpleaños número 22 :b
    """

    def __init__(self : Enigma22Service, verbose : bool = False) -> None:
        self.verbose : bool = verbose

    @staticmethod
    def _get_quest_obj() -> Optional[EnigmaQuest]:
        """
        Helper para extraer de la DB los datos de tu enigma de cum.
        :return : Objeto de la DB con los datos del enigma.
        """
        try:
            return (
                db.session
                    .query(EnigmaQuest)
                    .options(
                        db.joinedload(EnigmaQuest.hint_img_config),
                        db.joinedload(EnigmaQuest.hint_img_palette)
                            .joinedload(ColorPalette.stops),
                        db.joinedload(EnigmaQuest.solution_artifact)
                    )
                    .filter_by(alias="CUM22")
                    .first()
            )
        except Exception as e:
            raise e

    def get_quest(self : Enigma22Service) -> dict[str, Any]:
        """
        Recupera el enigma de tu cum de la DB
        :return : Datos del enigma en la DB.
        """
        try:
            quest_obj : Optional[EnigmaQuest] = self._get_quest_obj()

            if not quest_obj:
                print(f"[!]{Colors.RED} CUM22 QUEST NOT FOUND. ¿Qué le hiciste boba?")
                return {
                    "success"     : False,
                    "error"       : "CUM22 quest not found in DB",
                    "status_code" : 404
                }

            is_solved : bool = (quest_obj.solution_id is not None and quest_obj.solved_at is not None)

            quest_data : dict[str, Any] = quest_obj.to_dict()
            quest_data["is_solved"]     = is_solved

            if self.verbose:
                print(f"[OK]{Colors.GREEN} CUM22 QUEST (ID: #{quest_obj.id_quest}) RETRIEVED (SOLVED: {is_solved}){Colors.RESET}")

            return {
                "success"     : True,
                "data"        : quest_data,
                "status_code" : 200
            }

        except Exception as e:
            raise e

    def verify_solution(self : Enigma22Service, id_artifact : int) -> dict[str, Any]:
        """
        Comprueba si el artefacto seleccionado resuelve el enigma.
        :param id_artifact : ID del artefacto seleccionado.
        :return            : Bandera de éxito indicando si la solución es correcta.
        """
        try:
            quest_obj : Optional[EnigmaQuest] = self._get_quest_obj()
            if not quest_obj:
                print(f"[!]{Colors.RED} CUM22 QUEST NOT FOUND. ¿Qué le hiciste boba?")
                return {
                    "success"     : False,
                    "error"       : "CUM22 quest not found in DB",
                    "status_code" : 404
                }

            artifact : Optional[SynthesisArtifact] = (
                db.session
                    .query(SynthesisArtifact)
                    .options(
                        db.joinedload(SynthesisArtifact.source_image),
                        db.joinedload(SynthesisArtifact.turing_config)
                    )
                    .filter_by(id_artifact=id_artifact)
                    .first()
            )
            if not artifact:
                print(f"[!]{Colors.RED} ARTIFACT #{id_artifact} NOT FOUND IN THE VAULT")
                return {
                    "success"     : True,
                    "error"       : f"Artifact #{id_artifact} not found in The Vault",
                    "status_code" : 404
                }

            target_hash : str  = str(quest_obj.hint_img_hash).strip().lower()
            art_hash    : str  = str(artifact.artifact_hash).strip().lower()
            is_match    : bool = (target_hash == art_hash)

            if not is_match:
                print(f"[!]{Colors.YELLOW} ARTIFACT #{id_artifact} DOES NOT SOLVE THE ENIGMA ({art_hash} != {target_hash}){Colors.RESET}")
                return {
                    "success"     : True,
                    "message"     : "The artifact presented does not resonate with the enigma. Refine your reaction and try again, love.",
                    "data"        : {
                        "is_solved"     : False,
                        "id_artifact"   : id_artifact,
                        "artifact_hash" : art_hash,
                        "target_hash"   : target_hash,
                    },
                    "status_code" : 200
                }

            source_hash   : str     = artifact.source_image.sha256_hash if artifact.source_image else ""
            solution_hash : str     = compute_solution_sha512(source_hash, quest_obj.alias)

            quest_obj.solution_id   = artifact.id_artifact
            quest_obj.solution_hash = solution_hash
            quest_obj.solved_at     = datetime.now(timezone.utc)

            db.session.commit()

            print(f"[<3]{Colors.MAGENTA} YOU DID IT LOVE!!!!! THE ENIGMA HAS BEEN SOLVED BY ARTIFACT #{artifact.id_artifact}. {Colors.RESET}")
            print(f"[*]{Colors.CYAN} SECRET RUNE (SHA-512):{Colors.RESET} {quest_obj.solution_hash}")

            return {
                "success"     : True,
                "message"     : "The seal has been shattered. Happy Birthday, love <3",
                "data"        : {
                    "is_solved"         : True,
                    "id_artifact"       : artifact.id_artifact,
                    "artifact_alias"    : artifact.alias,
                    "artifact_hash"     : artifact.artifact_hash,
                    "secret_key"        : quest_obj.solution_hash,
                    "solved_at"         : quest_obj.solved_at.isoformat() if quest_obj.solved_at else None,
                    "solution_artifact" : artifact.to_dict()
                },
                "status_code" : 201
            }

        except Exception as e:
            db.session.rollback()
            raise e