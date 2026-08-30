# Vespera/app/core/utils/decorators.py

from typing import Any, Callable
from functools import wraps
import traceback

from flask import jsonify, Response

from app.core.config import Colors

def api_standard_endpoint(f : Callable) -> Callable:
    """
    Decorador para estandarizar las respuestas JSON de los endpoints de las API.
    :param f : Función controladora del endpoint.
    :return  : Respuesta estandarizada con código de estado HTTP.
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
            print(f"[!]{Colors.RED} UNEXPECTED ERROR IN CONTROLLER {f.__name__}{Colors.RESET}: {e}")
            traceback.print_exc()
            return jsonify({
                "success"     : False,
                "error"       : f"Unexpected controller {f.__name__} error: {e}",
                "status_code" : 500
            }), 500

    return decorated
