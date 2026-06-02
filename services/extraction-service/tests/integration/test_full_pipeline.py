import pytest
from app.agents.pipeline import ExtractionPipeline
from app.agents.classifier import DocumentClassifierAgent
from app.agents.section_finder import SectionFinderAgent
from app.agents.extractor import DataExtractionAgent
from app.agents.normalizer import NormalizationAgent
from app.infrastructure.ai.provider_factory import ProviderFactory
from .conftest import requires_api

@requires_api
@pytest.mark.asyncio
async def test_full_pipeline_integration():
    factory = ProviderFactory()
    pipeline = ExtractionPipeline(
        classifier=DocumentClassifierAgent(factory),
        section_finder=SectionFinderAgent(factory),
        extractor=DataExtractionAgent(factory),
        normalizer=NormalizationAgent()
    )
    
    # Using tiny PDF. This will likely extract nothing useful but it will exercise the full AI loop
    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <<>> /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 0 >>\nstream\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000213 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n264\n%%EOF"
    
    result = await pipeline.process(pdf_bytes)
    
    assert result.overall_confidence > 0.0
    assert result.classification is not None
    assert result.data is not None
