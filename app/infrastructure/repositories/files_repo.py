# Vespera/app/infrastructure/repositories/files_repo.py

from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageOps
from io import BytesIO

from app.core.config import Directories, Colors

class FileRepository:
    """
    Gestiona el almacenamiento físico de imágenes originales y patrones generados
    y frames sin duplicados.
    """

    @staticmethod
    def get_source_path(sha256_hash : str) -> Path:
        """
        Construye la ruta canónica de una imagen original basada en su Hash.
        """
        return Directories.INPUTS_DIR / f"original_{sha256_hash}.png"

    @staticmethod
    def get_artifact_path(sha256_hash : str) -> Path:
        """
        Construye la ruta canónica de un patrón de Turing generado basada en su Hash.
        """
        return Directories.OUTPUTS_DIR / f"turing_{sha256_hash}.png"

    @staticmethod
    def get_thumbnail_path(sha256_hash : str) -> Path:
        """
        Construye la ruta canónica para una miniatura de patrón de Turing.
        """
        return Directories.THUMBNAILS_DIR / f"thumb_{sha256_hash}.png"

    @staticmethod
    def get_frame_path(artifact_hash : str, frame_index : int) -> Path:
        """
        Construye la ruta en disco de un frame de animación para un patrón.
        """
        return Directories.FRAMES_DIR / f"frame_{artifact_hash}_{frame_index}.webp"

    @classmethod
    def save_source_image(
        cls        : type[FileRepository],
        image_data : bytes,
        sha256     : str
    ) -> tuple[Path, int, int, int]:
        """
        Guarda una imagen de entrada en formato PNG.
        :param image_data : Contenido binario de la imagen.
        :param sha256     : Hash SHA-256 precalculado de los bytes de la imagen.
        :return           : Tupla con la ruta de la imagen, su ancho, alto y tamaño en bytes.
        """
        try:
            target_path : Path = cls.get_source_path(sha256)
            if not target_path.exists():
                image : Image.Image = Image.open(BytesIO(image_data))
                image : Image.Image = ImageOps.exif_transpose(image)
                if image.mode != "RGB":
                    image : Image.Image = image.convert("RGB")
                image.save(target_path, format="PNG", optimize=True)

            with Image.open(target_path) as img:
                width, height = img.size
                size_bytes : int = target_path.stat().st_size

            return target_path, width, height, size_bytes

        except Exception as e:
            raise e

    @classmethod
    def save_animation_frame(
        cls           : type[FileRepository],
        frame_img     : Image.Image,
        artifact_hash : str,
        frame_index   : int
    ) -> Path:
        """
        Guarda un frame en formato WebP (optimizado para display).
        """
        try:
            frame_path : Path = cls.get_frame_path(artifact_hash, frame_index)
            if not frame_path.exists():
                frame_img.save(frame_path, format="WEBP", quality=85)
            return frame_path
        except Exception as e:
            raise e

    @classmethod
    def save_artifact_bundle(
        cls           : type[FileRepository],
        artifact_img  : Image.Image,
        sha256        : str
    ) -> tuple[Path, Path]:
        """
        Guarda la imagen completa del patrón de Turing y su thumbnail.
        :param artifact_img : Objeto PIL con el patrón renderizado.
        :param sha256       : Hash compuesto del patrón generado.
        :return : Tupla con la ruta del patrón y de su thumbnail.
        """
        try:
            out_path   : Path = cls.get_artifact_path(sha256)
            thumb_path : Path = cls.get_thumbnail_path(sha256)

            if not out_path.exists():
                artifact_img.save(out_path, format="PNG", optimize=True)

            if not thumb_path.exists():
                thumb : Image.Image = artifact_img.copy()
                thumb.thumbnail((256, 256), Image.Resampling.LANCZOS)
                thumb.save(thumb_path, format="PNG", optimize=True)

            return out_path, thumb_path

        except Exception as e:
            raise e

    @classmethod
    def delete_artifact_files(cls : type[FileRepository], sha256_hash : str) -> bool:
        """
        Elimina los archivos físicos de un patrón de Turing.
        """
        try:
            success    : bool = False
            out_path   : Path = cls.get_artifact_path(sha256_hash)
            thumb_path : Path = cls.get_thumbnail_path(sha256_hash)

            if out_path.exists():
                success : bool = True
                out_path.unlink()
            if thumb_path.exists():
                success : bool = True
                thumb_path.unlink()

            pattern_prefix : str = f"frame_{sha256_hash}_"
            for frame_file in Directories.FRAMES_DIR.glob(f"{pattern_prefix}*.webp"):
                try:
                    frame_file.unlink()
                except Exception as ex:
                    print(f"[!]{Colors.YELLOW} WARNING - COULD NOT DELETE FRAME {frame_file}. {Colors.RESET}{ex}")

            return success

        except Exception as e:
            raise e

    @classmethod
    def delete_orphaned_source_file(cls : type[FileRepository], sha256_hash : str) -> bool:
        """
        Elimina el archivo original si no está vinculado a ningún patrón de Turing.
        """
        try:
            src_path : Path = cls.get_source_path(sha256_hash)
            if src_path.exists():
                src_path.unlink()
                return True
            return False
        except Exception as e:
            raise e