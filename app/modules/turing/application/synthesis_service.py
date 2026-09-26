# Vespera/app/modules/turing/application/synthesis_service.py

from __future__ import annotations

from io import BytesIO
from typing import Any, Optional, Union
from pathlib import Path
import traceback
from time import perf_counter

from PIL import Image

from werkzeug.datastructures import FileStorage

from app.core.extensions import db
from app.core.config import TuringSettings, RNGSettings, Colors
from app.core.utils.cryptography_utils import compute_bytes_sha256, compute_params_hash, compute_artifact_hash
from app.core.utils.image_utils import is_image
from app.core.utils.text_utils import normalize_text
from app.infrastructure.models import (
    SourceImage,  SynthesisFrame, SynthesisArtifact,
    ConfigTuring, RelArtifactPalette
)
from app.infrastructure.files_repo import FileRepository
from app.modules.turing.domain.turing_engine import TuringEngine

class SynthesisService:
    """
    Servicio para la generación, deduplicación y almacenamiento de patrones de Turing.
    """

    # Caché para sostener las imágenes generadas para preview antes de guardarlas
    _ephemeral_cache : dict[str, dict[str, Any]] = {}

    def __init__(self : SynthesisService, verbose : bool = False) -> None:
        self.verbose : bool = verbose

    # --- CONFIGS ---
    @staticmethod
    def _get_or_create_config(
        feed_rate  : float,
        kill_rate  : float,
        diff_u     : float,
        diff_v     : float,
        dt         : float,
        iterations : int
    ) -> ConfigTuring:
        """
        Busca un conjunto de parámetros de configuración. Si no lo encuentra, lo crea y lo guarda.
        """
        try:
            config_hash : str = compute_params_hash(
                feed_rate  = feed_rate,
                kill_rate  = kill_rate,
                diff_u     = diff_u,
                diff_v     = diff_v,
                dt         = dt,
                iterations = iterations
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
                iterations    = iterations
            )
            db.session.add(new_config)
            db.session.flush()
            return new_config

        except Exception as e:
            raise e

    def get_system_configs(self : SynthesisService) -> dict[str, Any]:
        """
        Recupera las configuraciones por defecto para la generación de patrones de Turing.
        :return : Lista de configuraciones de la DB.
        """
        try:
            configs : list[ConfigTuring] = (
                db.session
                    .query(ConfigTuring)
                    .filter_by(is_system=True)
                    .order_by(db.asc(ConfigTuring.id_config))
                    .all()
            )

            return {
                "success"     : True,
                "data"        : [c.to_dict() for c in configs],
                "status_code" : 200
            }
        except Exception as e:
            print(f"[!]{Colors.RED} UNEXPECTED ERROR FETCHING SYSTEM CONFIGS:{Colors.RESET} {e}")
            if self.verbose: traceback.print_exc()
            return {
                "success"     : False,
                "error"       : str(e),
                "status_code" : 500
            }


    # --- SOURCE IMAGES ---
    @staticmethod
    def _get_or_create_source_image(
        file_bytes : bytes,
        alias      : str
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
                sha256_hash     = sha256,
                alias           = alias,
                width           = width,
                height          = height,
                file_size_bytes = size_bytes,
            )
            db.session.add(new_source)
            db.session.flush()
            return new_source

        except Exception as e:
            raise e


    # --- ARTIFACTS ---
    def generate_synthesis(
        self               : SynthesisService,
        params             : dict[str, Any],
        source_image       : Optional[FileStorage] = None,
    ) -> dict[str, Any]:
        """
        Orquesta la ejecución completa de la síntesis de Gray-Scott.
        :param params       : Diccionario con los parámetros recibidos en la petición.
        :param source_image : Archivo de la imagen original.
        :return             : Artefacto generado en formato de diccionario con keyframes.
        """
        start_time     : float           = perf_counter()
        execution_time : Optional[float] = None

        try:
            print(f"{Colors.CYAN}{'-' * 85}{Colors.RESET}")
            print(f"[*]{Colors.BLUE} INITIATING PATTERN GENERATION{Colors.RESET}")

            seed : int = int(params.get("seed", RNGSettings.SEED))
            if seed and seed != RNGSettings.SEED:
                print(f"[!]{Colors.YELLOW} WARNING: Se intentó ejecutar una semilla diferente al cumpleaños de la boba ({params['seed']}). Permiso denegado.{Colors.RESET}")
                return {
                    "success"     : False,
                    "error"       : f"Forbidden seed: {seed}",
                    "status_code" : 403
                }

            is_image_res    : dict[str, Any]  = is_image(source_image)
            file_bytes      : Optional[bytes] = source_image.read()            if is_image_res.get("is_image")  else None
            source_image_id : Optional[int]   = int(params["source_image_id"]) if params.get("source_image_id") else None
            source_rec      : Optional[SourceImage] = None

            if not file_bytes and source_image_id:
                source_rec : Optional[SourceImage] = (
                    db.session
                        .query(SourceImage)
                        .filter_by(id_source_image=source_image_id)
                        .first()
                )
                if source_rec:
                    source_path : Path = FileRepository.get_source_path(source_rec.sha256_hash)
                    if source_path.exists():
                        file_bytes : Optional[bytes] = source_path.read_bytes()

            if not file_bytes: return {
                "success"     : False,
                "error"       : "No catalyst provided.",
                "status_code" : 400
            }

            if source_rec:
                src_hash : str = source_rec.sha256_hash
                alias    : str = source_rec.alias
            else:
                src_hash     : str = compute_bytes_sha256(file_bytes)
                raw_filename : str = (
                    source_image.filename
                    if (source_image and is_image_res.get("is_image"))
                    else "catalyst.png" ) or "catalyst.png"

                alias      : str         = str(params.get("alias", raw_filename))
                source_rec : SourceImage = self._get_or_create_source_image(file_bytes, alias)

            feed_rate          : float         = float(params.get("feed_rate",      TuringSettings.DEFAULT_FEED_RATE))
            kill_rate          : float         = float(params.get("kill_rate",      TuringSettings.DEFAULT_KILL_RATE))
            diff_u             : float         = float(params.get("diff_u",         TuringSettings.DEFAULT_DIFF_U))
            diff_v             : float         = float(params.get("diff_v",         TuringSettings.DEFAULT_DIFF_V))
            dt                 : float         = float(params.get("dt",             TuringSettings.DEFAULT_DT))
            iterations         : int           = int(params.get("iterations",       TuringSettings.DEFAULT_ITERATIONS))
            frame_count        : int           = int(params.get("frame_count",      TuringSettings.DEFAULT_FRAMES))
            frame_dist_exp     : float         = float(params.get("frame_dist_exp", TuringSettings.DEFAULT_FRAME_DENSITY_EXP))
            id_palette         : int           = int(params.get("id_palette",       1))

            params_hash : str = compute_params_hash(
                feed_rate  = feed_rate,
                kill_rate  = kill_rate,
                diff_u     = diff_u,
                diff_v     = diff_v,
                dt         = dt,
                iterations = iterations,
            )
            artifact_hash : str = compute_artifact_hash(src_hash, params_hash, RNGSettings.SEED)

            engine : TuringEngine = TuringEngine(
                feed_rate      = feed_rate,
                kill_rate      = kill_rate,
                diff_u         = diff_u,
                diff_v         = diff_v,
                dt             = dt,
                iterations     = iterations,
                frame_count    = frame_count,
                frame_dist_exp = frame_dist_exp,
                seed           = seed,
                verbose        = self.verbose
            )

            src_path : Path = Path(FileRepository.get_source_path(src_hash))
            width  : int = params.get("width", TuringSettings.DEFAULT_WIDTH)
            height : int = params.get("height", TuringSettings.DEFAULT_HEIGHT)

            source_target : Union[Path, BytesIO] = src_path if src_path.exists() else BytesIO(file_bytes)
            with Image.open(source_target) as raw_pil:
                v_matrix, final_img, frame_pils, keyframes_b64, captured_iters = engine.simulate(
                    source_image     = raw_pil,
                    width            = width,
                    height           = height,
                    capture_timeline = True
                )

            execution_time : float = round(perf_counter() - start_time, 6)

            self._ephemeral_cache[artifact_hash] = {
                "file_bytes"      : file_bytes,
                "id_source_image" : source_rec.id_source_image,
                "alias"           : alias,
                "src_hash"        : src_hash,
                "artifact_hash"   : artifact_hash,
                "final_img"       : final_img,
                "frame_pils"      : frame_pils,
                "captured_iters"  : captured_iters,
                "execution_time"  : execution_time,
                "params"          : {
                    "feed_rate"  : feed_rate,
                    "kill_rate"  : kill_rate,
                    "diff_u"     : diff_u,
                    "diff_v"     : diff_v,
                    "dt"         : dt,
                    "iterations" : iterations,
                    "id_palette" : id_palette,
                    "seed"       : seed
                }
            }

            return {
                "success"     : True,
                "message"     : f"New pattern generated successfully in {execution_time:.6f} s",
                "data"        : {
                    "artifact_hash"  : artifact_hash,
                    "execution_time" : execution_time,
                    "keyframes"      : keyframes_b64,
                    "frame_count"    : len(keyframes_b64),
                    "is_committed"   : False
                },
                "status_code" : 200
            }

        except Exception as e:
            db.session.rollback()
            print(f"[!]{Colors.RED} UNEXPECTED ERROR GENERATING ARTIFACT:{Colors.RESET} {e}")
            if self.verbose: traceback.print_exc()
            return {
                "success"     : False,
                "error"       : str(e),
                "status_code" : 500
            }

        finally:
            if execution_time is None:
                execution_time : float = round((perf_counter() - start_time), 2)
                print(f"[!] {Colors.RED}TIME ELAPSED BEFORE ERROR:{Colors.RESET} {execution_time:.6f} s")
            else:
                print(f"[*] {Colors.BLUE}TIME ELAPSED:{Colors.RESET} {execution_time:.6f} s")
            print(f"{Colors.CYAN}{'-' * 85}{Colors.RESET}")

    def commit_artifact(
        self   : SynthesisService,
        params : dict[str, Any]
    ) -> dict[str, Any]:
        """
        Guarda el patrón en la DB una vez que la boba lo acepte :b
        :param params : Hash del patrón.
        :return       : Estado de éxito de la operación.
        """
        try:
            artifact_hash : str = str(params.get("artifact_hash", "")).strip()
            if not artifact_hash or artifact_hash not in self._ephemeral_cache:
                existing_artifact : Optional[SynthesisArtifact] = (
                    db.session
                        .query(SynthesisArtifact)
                        .filter_by(artifact_hash=artifact_hash)
                        .first()
                )
                if existing_artifact: return {
                    "success"     : True,
                    "message"     : "Artifact had already been sealed in the vault.",
                    "data"        : existing_artifact.to_dict(),
                    "status_code" : 200
                }
                return {
                    "success"     : False,
                    "error"       : f"No uncommited artifact found with rune {artifact_hash}. Please invoke a reaction first.",
                    "status_code" : 404
                }
            cached : dict[str, Any] = self._ephemeral_cache[artifact_hash]

            raw_palette_id : Any           = params.get("id_palette", cached["params"].get("id_palette", 0))
            id_palette     : int           = int(raw_palette_id) if raw_palette_id is not None else 0
            user_notes     : Optional[str] = str(params["user_notes"]).strip() if params.get("user_notes")         else None
            parent_id      : Optional[int] = int(params["parent_artifact_id"]) if params.get("parent_artifact_id") else None

            cached_source_id : Optional[int]         = cached.get("id_source_image")
            source_rec       : Optional[SourceImage] = None

            if cached_source_id:
                source_rec : Optional[SourceImage] = (
                    db.session
                        .query(SourceImage)
                        .filter_by(id_source_image=cached_source_id)
                        .first()
                )

            if not source_rec:
                source_rec : SourceImage = self._get_or_create_source_image(cached["file_bytes"], cached["alias"])

            artifact_alias : Optional[str] = params.get("alias")
            if not artifact_alias:
                existing_count : int = (
                    db.session
                        .query(SynthesisArtifact)
                        .filter_by(id_source_image=source_rec.id_source_image)
                        .count()
                )
                pattern_number : int = existing_count + 1
                clean_source_name : str = source_rec.alias.rsplit(".", 1)[0]
                artifact_alias    : str = f"pattern_{clean_source_name}_{pattern_number}.png"

            p : dict[str, Any] = cached["params"]
            config_rec : ConfigTuring = self._get_or_create_config(
                feed_rate  = p["feed_rate"],
                kill_rate  = p["kill_rate"],
                diff_u     = p["diff_u"],
                diff_v     = p["diff_v"],
                dt         = p["dt"],
                iterations = p["iterations"]
            )

            final_img : Image.Image = (
                cached["final_img"].convert("L")
                if cached["final_img"].mode != "L"
                else cached["final_img"]
            )
            FileRepository.save_artifact_bundle(final_img, artifact_hash)

            raw_fav : Any = params.get("is_favorite", False)
            is_favorite : bool = raw_fav if isinstance(raw_fav, bool) else str(raw_fav).strip().lower() in ("true", "1", "yes")

            artifact : SynthesisArtifact = SynthesisArtifact(
                id_source_image    = source_rec.id_source_image,
                id_config          = config_rec.id_config,
                id_parent_artifact = parent_id,
                alias              = normalize_text(artifact_alias),
                artifact_hash      = artifact_hash,
                seed               = p.get("seed", RNGSettings.SEED),
                execution_time     = cached["execution_time"],
                is_favorite        = is_favorite,
                user_notes         = user_notes
            )
            db.session.add(artifact)
            db.session.flush()

            if id_palette > 0:
                palette_rel : RelArtifactPalette = RelArtifactPalette(
                    id_artifact = artifact.id_artifact,
                    id_palette  = id_palette
                )
                db.session.add(palette_rel)

            for idx, (frame_img, iter_num) in enumerate(zip(cached["frame_pils"], cached["captured_iters"])):
                FileRepository.save_animation_frame(frame_img, artifact_hash, idx)
                frame_hash : str = compute_bytes_sha256(f"{artifact_hash}_{idx:03d}_{iter_num}".encode("utf-8"))

                frame_record : SynthesisFrame = SynthesisFrame(
                    id_artifact = artifact.id_artifact,
                    frame_index = idx,
                    iteration   = iter_num,
                    frame_hash  = frame_hash
                )
                db.session.add(frame_record)

            db.session.commit()

            # Limpiar Caché
            del self._ephemeral_cache[artifact_hash]

            if self.verbose:
                print(f"[OK]{Colors.GREEN} ARTIFACT #{artifact.id_artifact} SEALED IN VAULT WITH {len(cached['frame_pils'])} FRAMES.{Colors.RESET}")

            return {
                "success"     : True,
                "message"     : f"Artifact #{artifact.id_artifact} successfully sealed into The Vault.",
                "data"        : artifact.to_dict(),
                "status_code" : 201
            }
        except Exception as e:
            db.session.rollback()
            print(f"[!]{Colors.RED} UNEXPECTED ERROR SAVING ARTIFACT TO VAULT:{Colors.RESET} {e}")
            if self.verbose: traceback.print_exc()
            return {
                "success"     : False,
                "error"       : str(e),
                "status_code" : 500
            }
