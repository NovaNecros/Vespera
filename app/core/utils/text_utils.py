# Vespera/app/core/utils/text_utils.py

import unicodedata
from typing import Optional, Any

def normalize_text(text : Any, case : Optional[str] = None) -> str:
    """
    Helper para eliminar acentos, espacios extra y ajustar el case.
    :param text : Texto original.
    :param case : 'UPPER', 'LOWER', 'TITLE' o None.
    :return     : Texto normalizado.
    """
    try:
        clean_text : str = ""
        if not isinstance(text, str): clean_text : str = f"{text or ''}"
        clean_text : str = clean_text.replace("  ", " ").strip()
        clean_text : str = unicodedata.normalize("NFKD", clean_text)
        clean_text : str = "".join([c for c in clean_text if not unicodedata.combining(c)])
        if case:
            if case.upper()   == "UPPER": clean_text : str = clean_text.upper()
            elif case.upper() == "LOWER": clean_text : str = clean_text.lower()
            elif case.upper() == "TITLE": clean_text : str = clean_text.title()
        return clean_text
    except:
        return ""
