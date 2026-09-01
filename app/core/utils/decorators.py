# Vespera/app/core/utils/decorators.py

from typing import Any, Callable
from pathlib import Path
from functools import wraps
import traceback

from flask import jsonify, Response, abort, send_file

from app.core.config import Colors

def template_endpoint(f : Callable) -> Callable:
    """
    Decorador para estandarizar las respuestas HTML de los endpoints de las API.
    :param f : Función controladora del endpoint.
    :return  : HTML con código de estado HTTP.
    """
    @wraps(f)
    def decorated(*args : Any, **kwargs : Any) -> tuple[str, int]:
        try:
            return f(*args, **kwargs), 200
        except Exception as e:
            print(f"{Colors.RED} Unexpected error rendering template with controller {f.__name__}:{Colors.RESET} {e}")
            traceback.print_exc()
            abort(500)

    return decorated

def api_standard_endpoint(f : Callable) -> Callable:
    """
    Decorador para estandarizar las respuestas JSON de los endpoints de las API.
    :param f : Función controladora del endpoint.
    :return  : Respuesta JSON estandarizada con código de estado HTTP.
    """
    @wraps(f)
    def decorated(*args : Any, **kwargs : Any) -> tuple[Response, int]:
        try:
            res : dict[str, Any] = f(*args, **kwargs)

            if not isinstance(res, dict): return jsonify({
                "success"     : False,
                "error"       : f"Controller {f.__name__} returned a response with invalid format.",
                "status_code" : 502
            }), 502

            if not res.get("success"): return jsonify({
                "success"     : False,
                "error"       : f"Controller {f.__name__} error: {res.get('error', 'Unknown error')}",
                "status_code" : res.get("status_code", 500)
            }), res.get("status_code", 500)

            return jsonify(res), res.get("status_code", 200)
        except Exception as e:
            print(f"[!]{Colors.RED} Unexpected error in controller {f.__name__}{Colors.RESET}: {e}")
            traceback.print_exc()
            return jsonify({
                "success"     : False,
                "error"       : f"Unexpected controller {f.__name__} error: {e}",
                "status_code" : 500
            }), 500

    return decorated

def api_stream_endpoint(mimetype : str = "image/png") -> Callable:
    """
    Decorador para endpoints que transmiten archivos.
    :param mimetype : Tipo MIME del archivo (default: image/png)
    :return         : Respuesta con los bytes del archivo y código de estado HTTP.
    """
    def decorator(f : Callable) -> Callable:
        @wraps(f)
        def decorated(*args : Any, **kwargs : Any) -> tuple[Response, Any]:
            try:
                file_path : Path = f(*args, **kwargs)
                if file_path is None or not isinstance(file_path, Path) or not file_path.exists():
                    abort(404)
                return send_file(str(file_path), mimetype=mimetype), 200
            except Exception as e:
                print(f"[!]{Colors.RED} Unexpected error streaming file with controller {f.__name__}{Colors.RESET}: {e}")
                traceback.print_exc()
                abort(500)
        return decorated
    return decorator

