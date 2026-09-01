# Vespera/app/core/utils/image_utils.py

from PIL import Image
from typing import Any

from werkzeug.datastructures import FileStorage

def is_image(file_storage : Any) -> dict[str, Any]:
    """
    Verifica que el archivo cargado sea una imagen.
    :return : Bandera indicando si es una imagen y su razonamiento
    """
    if file_storage is None: return {
        "is_image" : False,
        "reason"   : "Object is none"
    }

    if not isinstance(file_storage, FileStorage): return {
        "is_image" : False,
        "reason"   : "Object is not FileStorage"
    }

    if not file_storage.stream: return {
        "is_image" : False,
        "reason"   : "FileStorage object with no stream"
    }

    try:
        with Image.open(file_storage.stream) as img:
            img.verify()
        return {"is_image" : True }
    except (IOError, SyntaxError):
        return {
            "is_image" : False,
            "reason"   : "Object is corrupted"
        }
    except Exception as e:
        return {
            "is_image" : False,
            "reason"   : f"Unexpected error: {str(e)}"
        }
    finally:
        file_storage.stream.seek(0)