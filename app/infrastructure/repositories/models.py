# Vespera/app/infrastructure/repositories/models.py

from __future__ import annotations

from typing import Any

from app.core.extensions import db

class ColorPalette(db.Model):
    """
    Paletas de color y gradientes almacenados en formato JSON.
    """
    __tablename__ : str = "color_palette"

    id_palette   = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name         = db.Column(db.String(64), unique=True, nullable=False, index=True)
    display_name = db.Column(db.String(128), nullable=False)
    is_system    = db.Column(db.Boolean, nullable=False, default=True)
    is_favorite  = db.Column(db.Boolean, nullable=False, default=False)
    created_at   = db.Column(db.DateTime, nullable=False, default=db.func.now())

    stops   = db.relationship("PaletteStop", back_populates="palette", cascade="all, delete-orphan", order_by="PaletteStop.stop_position.asc()", lazy=True)
    configs = db.relationship("ConfigTuring", back_populates="palette", lazy=True)

    def to_dict(self : ColorPalette) -> dict[str, Any]:
        return {
            "id_palette"   : self.id_palette,
            "name"         : self.name,
            "display_name" : self.display_name,
            "is_system"    : self.is_system,
            "is_favorite"  : self.is_favorite,
            "stops"        : [stop.to_dict() for stop in self.stops],
            "created_at"   : self.created_at
        }

class PaletteStop(db.Model):
    """
    Puntos de control cromáticos para definir un gradiente lineal normalizado.
    """

    __tablename__ : str = "palette_stop"

    id_stop       = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_palette    = db.Column(db.Integer, db.ForeignKey("color_palette.id_palette", ondelete="CASCADE"), nullable=False, index=True)
    stop_position = db.Column(db.Numeric(5,4), nullable=False)
    r             = db.Column(db.Integer,      nullable=False)
    g             = db.Column(db.Integer,      nullable=False)
    b             = db.Column(db.Integer,      nullable=False)

    palette = db.relationship("ColorPalette", back_populates="stops")

    @property
    def hex(self : PaletteStop):
        return f"#{self.r:02x}{self.g:02x}{self.b:02x}"

    def to_dict(self : PaletteStop) -> dict[str, Any]:
        return {
            "id_stop"      : self.id_stop,
            "id_palette"   : self.id_palette,
            "stop_position": self.stop_position,
            "r"            : self.r,
            "g"            : self.g,
            "b"            : self.b,
            "hex"          : self.hex
        }

class SourceImage(db.Model):
    """
    Registro de imágenes originales. Utiliza SHA-256 para evitar guardar duplicados.
    """
    __tablename__ : str = "source_image"

    id_source_image   = db.Column(db.Integer,     primary_key=True, autoincrement=True)
    sha256_hash       = db.Column(db.String(64),  nullable=False, unique=True, index=True)
    original_filename = db.Column(db.String(255), nullable=False)
    width             = db.Column(db.Integer,     nullable=False)
    height            = db.Column(db.Integer,     nullable=False)
    file_size_bytes   = db.Column(db.Integer,     nullable=False)
    created_at        = db.Column(db.DateTime,    nullable=False, default=db.func.now())

    artifacts = db.relationship("SynthesisArtifact", back_populates="source_image", lazy=True)

    def to_dict(self : SourceImage) -> dict[str, Any]:
        return {
            "id_source_image"   : self.id_source_image,
            "sha256_hash"       : self.sha256_hash,
            "original_filename" : self.original_filename,
            "width"             : self.width,
            "height"            : self.height,
            "file_size_bytes"   : self.file_size_bytes,
            "created_at"        : self.created_at.isoformat() if self.created_at else None
        }

class ConfigTuring(db.Model):
    """
    Parámetros canónicos del modelo Gray-Scott deduplicados por hash.
    """
    __tablename__ : str = "config_turing"

    id_config     = db.Column(db.Integer,      primary_key=True, autoincrement=True)
    config_hash   = db.Column(db.String(64),   nullable=False, unique=True, index=True)
    feed_rate     = db.Column(db.Numeric(8,6), nullable=False)
    kill_rate     = db.Column(db.Numeric(8,6), nullable=False)
    diff_u        = db.Column(db.Numeric(8,6), nullable=False)
    diff_v        = db.Column(db.Numeric(8,6), nullable=False)
    dt            = db.Column(db.Numeric(6,4), nullable=False)
    iterations    = db.Column(db.Integer,      nullable=False)
    id_palette    = db.Column(db.Integer,      db.ForeignKey("color_palette.id_palette", ondelete="RESTRICT"), nullable=False)
    created_at    = db.Column(db.DateTime,     nullable=False, default=db.func.now())

    palette   = db.relationship("ColorPalette", foreign_keys=[id_palette], back_populates="configs")
    artifacts = db.relationship("SynthesisArtifact", back_populates="turing_config", lazy=True)

    def to_dict(self : ConfigTuring) -> dict[str, Any]:
        return {
            "id_config"     : self.id_config,
            "config_hash"   : self.config_hash,
            "feed_rate"     : float(self.feed_rate),
            "kill_rate"     : float(self.kill_rate),
            "diff_u"        : float(self.diff_u),
            "diff_v"        : float(self.diff_v),
            "dt"            : float(self.dt),
            "iterations"    : self.iterations,
            "id_palette"    : self.id_palette,
            "palette"       : self.palette.to_dict() if self.palette else None,
            "created_at"    : self.created_at.isoformat() if self.created_at else None
        }

class SynthesisArtifact(db.Model):
    """
    Patron de Turing determinista generado por el modelo Gray-Scott.
    """
    __tablename__ : str = "synthesis_artifact"

    id_artifact        = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_source_image    = db.Column(db.Integer, db.ForeignKey("source_image.id_source_image", ondelete="RESTRICT"), nullable=False)
    id_config          = db.Column(db.Integer, db.ForeignKey("config_turing.id_config", ondelete="RESTRICT"), nullable=False)
    id_parent_artifact = db.Column(db.Integer, db.ForeignKey("synthesis_artifact.id_artifact", ondelete="SET NULL"), nullable=True)
    artifact_hash      = db.Column(db.String(64), unique=True, nullable=False, index=True)
    seed               = db.Column(db.Integer, nullable=False)
    execution_time     = db.Column(db.Numeric(10,2), nullable=False)
    is_favorite        = db.Column(db.Boolean, nullable=False, default=False)
    user_notes         = db.Column(db.String(1024), nullable=True)
    created_at         = db.Column(db.DateTime, nullable=False, default=db.func.now())

    source_image    = db.relationship("SourceImage", foreign_keys=[id_source_image], back_populates="artifacts")
    turing_config   = db.relationship("ConfigTuring", foreign_keys=[id_config], back_populates="artifacts")
    parent_artifact = db.relationship("SynthesisArtifact", remote_side=[id_artifact], foreign_keys=[id_parent_artifact])
    frames          = db.relationship("SynthesisFrame", back_populates="artifact", cascade="all, delete-orphan", order_by="SynthesisFrame.frame_index.asc()", lazy=True)

    def to_dict(self : SynthesisArtifact) -> dict[str, Any]:
        return {
            "id_artifact"        : self.id_artifact,
            "artifact_hash"      : self.artifact_hash,
            "id_source_image"    : self.id_source_image,
            "id_parent_artifact" : self.id_parent_artifact,
            "seed"               : self.seed,
            "execution_time"     : float(self.execution_time),
            "is_favorite"        : bool(self.is_favorite),
            "user_notes"         : self.user_notes or "",
            "created_at"         : self.created_at.isoformat()  if self.created_at    else None,
            "source_image"       : self.source_image.to_dict()  if self.source_image  else None,
            "config"             : self.turing_config.to_dict() if self.turing_config else None,
            "frames"             : [frame.to_dict() for frame in self.frames] if self.frames else [],
        }

class SynthesisFrame(db.Model):
    """
    Frames del progreso de transformación de la imagen original.
    """
    __tablename__ : str = "synthesis_frame"

    id_frame    = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_artifact = db.Column(db.Integer, db.ForeignKey("synthesis_artifact.id_artifact", ondelete="CASCADE"), nullable=False, index=True)
    frame_index = db.Column(db.Integer, nullable=False)
    iteration   = db.Column(db.Integer, nullable=False)
    frame_hash  = db.Column(db.String(64), nullable=False)
    created_at  = db.Column(db.DateTime, nullable=False, default=db.func.now())

    artifact = db.relationship("SynthesisArtifact", back_populates="frames")

    def to_dict(self : SynthesisFrame) -> dict[str, Any]:
        return {
            "id_frame"    : self.id_frame,
            "id_artifact" : self.id_artifact,
            "frame_index" : self.frame_index,
            "iteration"   : self.iteration,
            "frame_hash"  : self.frame_hash,
            "created_at"  : self.created_at.isoformat() if self.created_at else None
        }

class EnigmaQuest(db.Model):
    """
    Estado y configuración del enigma de cum :p
    """
    __tablename__ : str = "enigma_quest"

    id_quest           = db.Column(db.Integer, primary_key=True, autoincrement=True)
    solution_id        = db.Column(db.Integer, db.ForeignKey("synthesis_artifact.id_artifact", ondelete="SET NULL"), nullable=True)
    solution_config_id = db.Column(db.Integer, db.ForeignKey("config_turing.id_config", ondelete="RESTRICT"), nullable=False)
    hint_image_hash    = db.Column(db.String(64), nullable=True)
    is_unlocked        = db.Column(db.Boolean, nullable=False, default=False)
    unlocked_at        = db.Column(db.DateTime, nullable=True)

    solution_artifact = db.relationship("SynthesisArtifact", foreign_keys=[solution_id])
    solution_config   = db.relationship("ConfigTuring", foreign_keys=[solution_config_id])

    def to_dict(self : EnigmaQuest) -> dict[str, Any]:
        return {
            "id_quest"           : self.id_quest,
            "solution_id"        : self.solution_id,
            "solution_config_id" : self.solution_config_id,
            "hint_image_hash"    : self.hint_image_hash,
            "is_unlocked"        : self.is_unlocked,
            "unlocked_at"        : self.unlocked_at.isoformat()     if self.unlocked_at       else None,
            "solution_artifact"  : self.solution_artifact.to_dict() if self.solution_artifact else None,
            "solution_config"    : self.solution_config.to_dict()   if self.solution_config   else None
        }
