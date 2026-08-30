# Vespera/app/infrastructure/models.py

from __future__ import annotations

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

# Turing Artifacts
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