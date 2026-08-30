# Vespera/app/core/utils/cryptography_utils.py

import hashlib
from pathlib import Path

def compute_bytes_sha256(data : bytes) -> str:
    """
    Calcula el hash SHA-256 (el mismo del Bitcoin) de una secuencia de bytes.
    :param data : Contenido en bytes.
    :return     : Cadena de 64 caracteres hex.
    """
    try:
        hasher = hashlib.sha256()
        hasher.update(data)
        return hasher.hexdigest()
    except Exception as e:
        raise e

def compute_file_sha256(file_path : Path, chunk_size : int = 65536) -> str:
    """
    Calcular el hash SHA-256 de un archivo en disco por bloques.
    :param file_path  : Ruta del archivo.
    :param chunk_size : Tamaño del bloque en bytes.
    :return           : Cadena del hash en hex.
    """
    try:
        if not file_path.exists():
            raise FileNotFoundError
        hasher = hashlib.sha256()
        with file_path.open("rb") as f:
            while chunk := f.read(chunk_size):
                hasher.update(chunk)
        return hasher.hexdigest()
    except Exception as e:
        raise e

def compute_params_hash(
    feed_rate     : float,
    kill_rate     : float,
    diff_u        : float,
    diff_v        : float,
    dt            : float,
    iterations    : int,
    color_palette : str
) -> str:
    """
    Genera el hash canónico único para una combinación de parámetros de la simulación.
    :return : Firma del conjunto de parámetros.
    """
    try:
        signature : str = (
            f"F:{feed_rate:.6f}|"
            f"k:{kill_rate:.6f}|"
            f"Du:{diff_u:.6f}|"
            f"Dv:{diff_v:.6f}|"
            f"dt:{dt:.6f}|"
            f"iter:{iterations}|"
            f"pal:{color_palette}"
        )
        return compute_bytes_sha256(signature.encode("utf-8"))
    except Exception as e:
        raise e

def compute_artifact_hash(
    image_hash  : str,
    params_hash : str,
    seed        : int
) -> str:
    """
    Segunda capa de SHA-256 aplicada para generar un hash compuesto.
    :return : Hash compuesto de la imagen + parámetros + semilla.
    """
    try:
        composite_signature : str = f"IMG:{image_hash}|PAR:{params_hash}|SEED:{seed}"
        return compute_bytes_sha256(composite_signature.encode("utf-8"))
    except Exception as e:
        raise e