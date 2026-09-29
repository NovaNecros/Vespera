# Vespera/app/modules/enigmas/services.py

from __future__ import annotations

from typing import Any

from app.modules.enigmas.application.enigma22_service import Enigma22Service

class EnigmasService:
    """
    Orquesta y centraliza los servicios de los enigmas.
    (Maybe I'll do updates in the future. Probablemente no xd.)
    """

    def __init__(self : EnigmasService, verbose : bool = False) -> None:
        self.enigma22_service : Enigma22Service = Enigma22Service(verbose=verbose)
        self.verbose          : bool            = verbose

    def get_enigma22_quest(self : EnigmasService) -> dict[str, Any]:
        return self.enigma22_service.get_quest()

    def verify_solution(self : EnigmasService, id_artifact : int) -> dict[str, Any]:
        return self.enigma22_service.verify_solution(id_artifact=id_artifact)