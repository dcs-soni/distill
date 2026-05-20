import pytest
from unittest.mock import AsyncMock, MagicMock
from app.agents.pipeline import ExtractionPipeline
from app.application.dto.classification_result import ClassificationResult
from app.application.dto.section import Section
from app.application.dto.raw_financial_data import RawFinancialData
from app.domain.entities.financial_data import FinancialData

@pytest.fixture
def mock_agents():
    classifier = MagicMock()
    classifier.classify = AsyncMock(return_value=ClassificationResult(doc_type="annual_report", confidence=0.8, language="en", page_count=10, is_scanned=False))
    
    section_finder = MagicMock()
    section_finder.find_sections = AsyncMock(return_value=[Section(name="Income Statement", start_page=1, end_page=2, confidence=0.9)])
    
    extractor = MagicMock()
    extractor.extract = AsyncMock(return_value=RawFinancialData(confidence_score=0.9))
    
    normalizer = MagicMock()
    normalizer.normalize = AsyncMock(return_value=FinancialData(confidence_score=0.9, field_confidences={}))
    
    return classifier, section_finder, extractor, normalizer

@pytest.mark.asyncio
async def test_pipeline_success(mock_agents):
    classifier, section_finder, extractor, normalizer = mock_agents
    pipeline = ExtractionPipeline(classifier, section_finder, extractor, normalizer)
    
    content = b"PDF_BYTES"
    result = await pipeline.process(content)
    
    assert result.overall_confidence > 0.5
    assert result.data is not None
    assert result.classification is not None
    assert len(result.sections) == 1
    
    # Check that cache was populated
    assert len(pipeline._cache) == 1

@pytest.mark.asyncio
async def test_pipeline_caching(mock_agents):
    classifier, section_finder, extractor, normalizer = mock_agents
    pipeline = ExtractionPipeline(classifier, section_finder, extractor, normalizer)
    
    content = b"CACHED_BYTES"
    await pipeline.process(content)
    
    # Process again
    await pipeline.process(content)
    
    # Should only have been called once due to caching
    assert classifier.classify.call_count == 1
    assert section_finder.find_sections.call_count == 1

@pytest.mark.asyncio
async def test_pipeline_partial_failure(mock_agents):
    classifier, section_finder, extractor, normalizer = mock_agents
    
    # Make extraction fail
    extractor.extract.side_effect = Exception("API Timeout")
    
    pipeline = ExtractionPipeline(classifier, section_finder, extractor, normalizer)
    
    result = await pipeline.process(b"FAIL_BYTES")
    
    assert result.overall_confidence == 0.01
    assert "API Timeout" in result.metadata["error"]
    assert result.data is None
    # Ensure it wasn't cached
    assert len(pipeline._cache) == 0
