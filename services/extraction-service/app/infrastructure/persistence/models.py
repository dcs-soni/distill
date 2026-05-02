from sqlalchemy import Column, String, Integer, Float, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from .database import Base

class ExtractionModel(Base):
    __tablename__ = "extractions"

    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, nullable=False, index=True)
    document_id = Column(String, nullable=False, index=True)
    version = Column(Integer, nullable=False)
    confidence = Column(Float, nullable=False)
    provider_used = Column(String, nullable=False)
    model_used = Column(String, nullable=False)
    prompt_version = Column(String, nullable=False)
    processing_time_ms = Column(Integer, nullable=False)
    token_count = Column(Integer, nullable=False)
    cost_usd = Column(Float, nullable=False, default=0.0)
    data = Column(JSONB, nullable=True)

    __table_args__ = (
        Index("ix_extractions_tenant_id_document_id", "tenant_id", "document_id"),
        UniqueConstraint("document_id", "version", name="uq_document_version"),
    )
