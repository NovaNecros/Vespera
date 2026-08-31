# Vespera/app/infrastructure/repositories/models.py

from __future__ import annotations

from typing import Any

from app.core.extensions import db

# Source Images
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

# Configuración Parámetros Turing
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
    color_palette = db.Column(db.String(50),   nullable=False)
    created_at    = db.Column(db.DateTime,     nullable=False, default=db.func.now())

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
            "color_palette" : self.color_palette,
            "created_at"    : self.created_at.isoformat() if self.created_at else None
        }

# Turing Artifacts
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
    execution_time_ms  = db.Column(db.Numeric(10,2), nullable=False)
    is_favorite        = db.Column(db.Boolean, nullable=False, default=False)
    user_notes         = db.Column(db.String(1024), nullable=True)
    created_at         = db.Column(db.DateTime, nullable=False, default=db.func.now())

    source_image    = db.relationship("SourceImage", foreign_keys=[id_source_image], back_populates="artifacts")
    turing_config   = db.relationship("ConfigTuring", foreign_keys=[id_config], back_populates="artifacts")
    parent_artifact = db.relationship("SynthesisArtifact", remote_side=[id_artifact], foreign_keys=[id_parent_artifact])

    def to_dict(self : SynthesisArtifact) -> dict[str, Any]:
        return {
            "id_artifact"        : self.id_artifact,
            "artifact_hash"      : self.artifact_hash,
            "id_source_image"    : self.id_source_image,
            "id_parent_artifact" : self.id_parent_artifact,
            "seed"               : self.seed,
            "execution_time_ms"  : float(self.execution_time_ms),
            "is_favorite"        : bool(self.is_favorite),
            "user_notes"         : self.user_notes or "",
            "created_at"         : self.created_at.isoformat()  if self.created_at    else None,
            "source_image"       : self.source_image.to_dict()  if self.source_image  else None,
            "config"             : self.turing_config.to_dict() if self.turing_config else None
        }

# Enigma
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