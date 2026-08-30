# Vespera/app/core/utils/date_utils.py

from __future__ import annotations

from typing import Optional, Union
from datetime import datetime, date


def format_datetime(
    dt  : Optional[Union[datetime, date, str]],
    fmt : str = "%Y-%m-%d %H:%M:%S"
) -> str:
    """
    Formate objetos date o datetime a strings.
    :param dt  : Objeto datetime o date.
    :param fmt : Formato de salida.
    :return    : Cadena formateada.
    """
    if dt is None: return ""

    if isinstance(dt, str):
        try:
            parsed : datetime = datetime.fromisoformat(dt)
            return parsed.strftime(fmt)
        except ValueError:
            return dt

    if isinstance(dt, (datetime, date)):
        return dt.strftime(fmt)

    return ""
