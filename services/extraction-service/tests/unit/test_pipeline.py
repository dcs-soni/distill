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
async def test_pipeline_success_and_weights(mock_agents):
    classifier, section_finder, extractor, normalizer = mock_agents
    pipeline = ExtractionPipeline(classifier, section_finder, extractor, normalizer)
    
    content = b"PDF_BYTES"
    result = await pipeline.process(content)
    
    # 0.15*0.8 + 0.15*0.9 + 0.5*0.9 + 0.2*1.0 = 0.12 + 0.135 + 0.45 + 0.2 = 0.905
    assert result.overall_confidence == 0.905
    assert result.data is not None
    assert result.classification is not None
    assert len(result.sections) == 1
    assert len(pipeline._cache) == 1

@pytest.mark.asyncio
async def test_pipeline_caching(mock_agents):
    classifier, section_finder, extractor, normalizer = mock_agents
    pipeline = ExtractionPipeline(classifier, section_finder, extractor, normalizer)
    
    content = b"CACHED_BYTES"
    await pipeline.process(content)
    
    # Process again
    await pipeline.process(content)
    
    assert classifier.classify.call_count == 1
    assert section_finder.find_sections.call_count == 1

@pytest.mark.asyncio
async def test_pipeline_partial_failure(mock_agents):
    classifier, section_finder, extractor, normalizer = mock_agents
    extractor.extract.side_effect = Exception("API Timeout")
    pipeline = ExtractionPipeline(classifier, section_finder, extractor, normalizer)
    
    result = await pipeline.process(b"FAIL_BYTES")
    
    assert result.overall_confidence == 0.01
    assert "API Timeout" in result.metadata["error"]
    assert result.data is None
    assert len(pipeline._cache) == 0

@pytest.mark.asyncio
async def test_pipeline_no_sections_found(mock_agents):
    classifier, section_finder, extractor, normalizer = mock_agents
    # Section finder returns empty list
    section_finder.find_sections = AsyncMock(return_value=[])
    
    pipeline = ExtractionPipeline(classifier, section_finder, extractor, normalizer)
    result = await pipeline.process(b"NO_SECTIONS_BYTES")
    
    # Section confidence defaults to 1.0 when empty
    # 0.15*0.8 + 0.15*1.0 + 0.5*0.9 + 0.2*1.0 = 0.12 + 0.15 + 0.45 + 0.2 = 0.92
    assert result.overall_confidence == 0.92
    assert result.data is not None
    assert len(result.sections) == 0

@pytest.mark.asyncio
async def test_pipeline_cache_different_content(mock_agents):
    classifier, section_finder, extractor, normalizer = mock_agents
    pipeline = ExtractionPipeline(classifier, section_finder, extractor, normalizer)
    
    await pipeline.process(b"CONTENT_1")
    await pipeline.process(b"CONTENT_2")
    
    assert classifier.classify.call_count == 2
    assert len(pipeline._cache) == 2
