# Vespera/app/modules/turing/application/synthesis_service.py

from __future__ import annotations

from typing import Any, Optional
from pathlib import Path
from time import perf_counter
from PIL import Image

from app.core.extensions import db
from app.core.config import TuringSettings, RNGSettings, Colors
from app.core.utils.cryptography_utils import compute_bytes_sha256, compute_params_hash, compute_artifact_hash
from app.infrastructure.repositories.models import SourceImage, ConfigTuring, SynthesisArtifact
from app.infrastructure.repositories.files_repo import FileRepository
from app.modules.turing.domain.turing_engine import TuringEngine

class SynthesisService:
    """
    Servicio para la generación, deduplicación y almacenamiento de patrones de Turing.
    """

    def __init__(self : SynthesisService, verbose : bool = False) -> None:
        self.verbose : bool = verbose

    @staticmethod
    def _get_or_create_config(
        feed_rate     : float,
        kill_rate     : float,
        diff_u        : float,
        diff_v        : float,
        dt            : float,
        iterations    : int,
        color_palette : str
    ) -> ConfigTuring:
        """
        Busca un conjunto de parámetros de configuración. Si no lo encuentra, lo crea y lo guarda.
        """
        try:
            config_hash : str = compute_params_hash(
                feed_rate,
                kill_rate,
                diff_u,
                diff_v,
                dt,
                iterations,
                color_palette
            )

            existing_config : Optional[ConfigTuring] = (
                db.session
                    .query(ConfigTuring)
                    .filter_by(config_hash=config_hash)
                    .first()
            )

            if existing_config: return existing_config

            new_config : ConfigTuring = ConfigTuring(
                config_hash   = config_hash,
                feed_rate     = feed_rate,
                kill_rate     = kill_rate,
                diff_u        = diff_u,
                diff_v        = diff_v,
                dt            = dt,
                iterations    = iterations,
                color_palette = color_palette
            )
            db.session.add(new_config)
            db.session.flush()
            return new_config

        except Exception as e:
            raise e

    @staticmethod
    def _get_or_create_source_image(
        file_bytes        : bytes,
        original_filename : str
    ) -> SourceImage:
        """
        Verifica si una imagen original ya se encuentra en la DB usando su hash; si no, la guarda.
        """
        try:
            sha256 : str = compute_bytes_sha256(file_bytes)

            existing_img : Optional[SourceImage] = (
                db.session
                    .query(SourceImage)
                    .filter_by(sha256_hash=sha256)
                    .first()
            )
            if existing_img: return existing_img

            path, width, height, size_bytes = FileRepository.save_source_image(file_bytes, sha256)

            new_source : SourceImage = SourceImage(
                sha256_hash       = sha256,
                original_filename = original_filename,
                width             = width,
                height            = height,
                file_size_bytes   = size_bytes,
            )
            db.session.add(new_source)
            db.session.flush()
            return new_source

        except Exception as e:
            raise e

    def generate_synthesis(
        self               : SynthesisService,
        params             : dict[str, Any],
        file_bytes         : Optional[bytes] = None,
    ) -> dict[str, Any]:
        """
        Orquesta la ejecución completa de la síntesis de Gray-Scott.
        :param params     : Diccionario con los parámetros recibidos en la petición.
        :param file_bytes : Bytes de la imagen subida en multipart/form-data si aplica.
        :return : Artefacto generado en formato de diccionario con keyframes.
        """
        start_time        : float           = perf_counter()
        execution_time_ms : Optional[float] = None

        try:
            print(f"{Colors.CYAN}{'-' * 85}{Colors.RESET}")
            if not self.verbose:
                print(f"[*]{Colors.BLUE} INITIATING PATTERN GENERATION{Colors.RESET}")
            else:
                print(f"[*]{Colors.BLUE} PARSING REQUEST PARAMETERS...{Colors.RESET}")

            if params.get("seed") and params["seed"] != RNGSettings.SEED:
                print(f"[!]{Colors.YELLOW} WARNING: Se intentó ejecutar una semilla diferente al cumpleaños de la boba ({params['seed']}). Permiso denegado.{Colors.RESET}")
                return {
                    "success"     : False,
                    "error"       : f"Forbidden seed {params['seed']}",
                    "status_code" : 403
                }

            source_image_id    : Optional[int] = int(params["source_image_id"]) if params.get("source_image_id") else None
            original_filename  : str           = str(params.get("original_filename", "upload.png"))
            feed_rate          : float         = float(params.get("feed_rate", TuringSettings.DEFAULT_FEED_RATE))
            kill_rate          : float         = float(params.get("kill_rate", TuringSettings.DEFAULT_KILL_RATE))
            diff_u             : float         = float(params.get("diff_u", TuringSettings.DEFAULT_DIFF_U))
            diff_v             : float         = float(params.get("diff_v", TuringSettings.DEFAULT_DIFF_V))
            dt                 : float         = float(params.get("dt", TuringSettings.DEFAULT_DT))
            iterations         : int           = int(params.get("iterations", TuringSettings.DEFAULT_ITERATIONS))
            frame_count        : int           = int(params.get("frame_count", TuringSettings.DEFAULT_FRAMES))
            color_palette      : str           = str(params.get("color_palette", TuringSettings.DEFAULT_PALETTE))
            seed               : int           = RNGSettings.SEED
            parent_artifact_id : Optional[int] = int(params["parent_artifact_id"]) if params.get("parent_artifact_id") else None
            user_notes         : Optional[str] = str(params["user_notes"]) if params.get("user_notes") else None
            capture_timeline   : bool          = bool(params.get("capture_timeline", True))


            if self.verbose:
                print(f"[*]{Colors.BLUE} PROCESSING INPUT IMAGE...{Colors.RESET}")

            if file_bytes is not None:
                source_record : SourceImage = self._get_or_create_source_image(file_bytes, original_filename)
            elif source_image_id is not None:
                source_record : Optional[SourceImage] = (
                    db.session
                        .query(SourceImage)
                        .filter_by(id_source_image = source_image_id)
                        .first()
                )
                if not source_record: return {
                    "success"     : False,
                    "error"       : f"Source image #{source_image_id} not found in DB.",
                    "status_code" : 404
                }
            else:
                return {
                    "success"     : False,
                    "error"       : "No image payload or source image ID provided.",
                    "status_code" : 400
                }

            if self.verbose:
                print(f"[*]{Colors.BLUE} PROCESSING PARAMETER SETTINGS...{Colors.RESET}")

            config_record : ConfigTuring = self._get_or_create_config(
                feed_rate     = feed_rate,
                kill_rate     = kill_rate,
                diff_u        = diff_u,
                diff_v        = diff_v,
                dt            = dt,
                iterations    = iterations,
                color_palette = color_palette
            )

            if self.verbose:
                print(f"[*]{Colors.BLUE} CHECKING DB FOR EXISTENCE...{Colors.RESET}")

            artifact_hash : str = compute_artifact_hash(
                image_hash  = source_record.sha256_hash,
                params_hash = config_record.config_hash,
                seed        = seed
            )

            existing_artifact : Optional[SynthesisArtifact] = (
                db.session
                    .query(SynthesisArtifact)
                    .filter_by(artifact_hash = artifact_hash)
                    .first()
            )

            if existing_artifact:
                if self.verbose:
                    print(f"[OK]{Colors.YELLOW} PATTERN CACHE HIT FOR HASH: {Colors.RESET}{artifact_hash}")
                return {
                    "success"     : True,
                    "message"     : "Pattern already exists in DB.",
                    "data"        : existing_artifact.to_dict(),
                    "status_code" : 200
                }

            if self.verbose:
                print(f"[*]{Colors.BLUE} GENERATING PATTERN...{Colors.RESET}")

            source_file_path : Path = FileRepository.get_source_path(source_record.sha256_hash)
            with Image.open(source_file_path) as raw_img:
                pil_source : Image.Image = raw_img.convert("RGB")

            engine : TuringEngine = TuringEngine(
                feed_rate     = feed_rate,
                kill_rate     = kill_rate,
                diff_u        = diff_u,
                diff_v        = diff_v,
                dt            = dt,
                iterations    = iterations,
                frame_count   = frame_count,
                color_palette = color_palette,
                seed          = seed
            )

            _, rendered_img, keyframes = engine.simulate(
                source_image     = pil_source,
                width            = TuringSettings.DEFAULT_WIDTH,
                height           = TuringSettings.DEFAULT_HEIGHT,
                capture_timeline = capture_timeline
            )

            if self.verbose:
                print(f"[*]{Colors.BLUE} SAVING PATTERN...{Colors.RESET}")

            FileRepository.save_artifact_bundle(rendered_img, artifact_hash)

            execution_time_ms : float = (perf_counter() - start_time) * 1000.0

            artifact : SynthesisArtifact = SynthesisArtifact(
                id_source_image    = source_record.id_source_image,
                id_config          = config_record.id_config,
                id_parent_artifact = parent_artifact_id,
                artifact_hash      = artifact_hash,
                seed               = seed,
                execution_time_ms  = execution_time_ms,
                is_favorite        = False,
                user_notes         = user_notes
            )

            db.session.add(artifact)
            db.session.commit()

            if self.verbose:
                print(f"[OK]{Colors.GREEN} PATTERN GENERATED AND SAVED TO DB WITH:{Colors.RESET}")
                print(f" > ID   : #{artifact.id_artifact}")
                print(f" > HASH : {artifact_hash}")

            artifact_data : dict[str, Any] = artifact.to_dict()
            artifact_data["keyframes"]     = keyframes

            return {
                "success"     : True,
                "message"     : f"New pattern generated successfully in {execution_time_ms:.4f} ms",
                "data"        : artifact_data,
                "status_code" : 201
            }

        except Exception as e:
            db.session.rollback()
            raise e

        finally:
            if execution_time_ms is None:
                execution_time_ms : float = (perf_counter() - start_time) * 1000.0
                print(f"[!] {Colors.RED}TIME ELAPSED BEFORE ERROR:{Colors.RESET} {execution_time_ms:.4f} ms")
            else:
                print(f"[*] {Colors.BLUE}TIME ELAPSED:{Colors.RESET} {execution_time_ms:.4f} ms")
            print(f"{Colors.CYAN}{'-' * 85}{Colors.RESET}")
