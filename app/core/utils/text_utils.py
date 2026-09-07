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
        if text is None: return ""
        clean_text : str = str(text).strip()
        clean_text : str = " ".join(clean_text.split())
        clean_text : str = unicodedata.normalize("NFKD", clean_text)
        clean_text : str = "".join([c for c in clean_text if not unicodedata.combining(c)])
        if case:
            case_norm : str = case.split()[0].strip().upper()
            if case_norm   == "UPPER": clean_text : str = clean_text.upper()
            elif case_norm == "LOWER": clean_text : str = clean_text.lower()
            elif case_norm == "TITLE": clean_text : str = clean_text.title()
        return clean_text
    except:
        return ""
