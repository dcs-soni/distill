from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from .models import ExtractionModel
from app.domain.entities.extraction import Extraction

class ExtractionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def save(self, extraction: Extraction, data: dict = None) -> ExtractionModel:
        model = ExtractionModel(
            id=extraction.id,
            tenant_id=extraction.tenant_id,
            document_id=extraction.document_id,
            version=extraction.version,
            confidence=extraction.confidence,
            provider_used=extraction.provider_used,
            model_used=extraction.model_used,
            prompt_version=extraction.prompt_version,
            processing_time_ms=extraction.processing_time_ms,
            token_count=extraction.token_count,
            cost_usd=extraction.cost_usd,
            data=data
        )
        self.session.add(model)
        await self.session.commit()
        await self.session.refresh(model)
        return model

    async def get_by_document_id(self, tenant_id: str, document_id: str) -> List[ExtractionModel]:
        stmt = select(ExtractionModel).where(
            ExtractionModel.tenant_id == tenant_id,
            ExtractionModel.document_id == document_id
        ).order_by(ExtractionModel.version.desc())
        
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_latest(self, tenant_id: str, document_id: str) -> Optional[ExtractionModel]:
        stmt = select(ExtractionModel).where(
            ExtractionModel.tenant_id == tenant_id,
            ExtractionModel.document_id == document_id
        ).order_by(ExtractionModel.version.desc()).limit(1)
        
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
