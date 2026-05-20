import pytest
from unittest.mock import AsyncMock, MagicMock
from app.agents.extractor import DataExtractionAgent
from app.application.dto.section import Section
from app.application.dto.raw_financial_data import RawFinancialData

@pytest.mark.asyncio
async def test_extractor_extracts_data():
    mock_factory = MagicMock()
    
    mock_result = RawFinancialData(
        company_name="Test Corp",
        fiscal_year="FY24",
        revenue="1000.0",
        net_profit="100.0",
        ebitda=None,
        total_assets="5000.0",
        total_liabilities="2000.0",
        currency="USD",
        confidence_score=0.9,
        field_confidences={"revenue": 0.9}
    )
    mock_factory.execute = AsyncMock(return_value=mock_result)
    
    mock_loader = MagicMock()
    mock_loader.load.return_value = "Test Prompt"
    
    agent = DataExtractionAgent(provider_factory=mock_factory, prompt_loader=mock_loader)
    
    # Mock document content (e.g. 10 pages)
    document_content = [b"page1", b"page2", b"page3", b"page4", b"page5"]
    
    sections = [
        Section(name="Income Statement", start_page=2, end_page=3, confidence=0.9),
        Section(name="Balance Sheet", start_page=4, end_page=4, confidence=0.8)
    ]
    
    result = await agent.extract(document_content, sections)
    
    assert result.company_name == "Test Corp"
    assert result.revenue == "1000.0"
    
    # Should have extracted pages 2, 3, 4 (0-indexed in list -> indices 1, 2, 3)
    # The targeted content should be [b"page2", b"page3", b"page4"]
    mock_factory.execute.assert_called_once()
    called_kwargs = mock_factory.execute.call_args.kwargs
    assert called_kwargs["prompt"] == "Test Prompt"
    assert called_kwargs["document_content"] == [b"page2", b"page3", b"page4"]
    assert called_kwargs["schema"] == RawFinancialData

@pytest.mark.asyncio
async def test_extractor_no_sections_processes_all():
    mock_factory = MagicMock()
    mock_factory.execute = AsyncMock(return_value=RawFinancialData(confidence_score=0.5))
    
    agent = DataExtractionAgent(provider_factory=mock_factory)
    
    document_content = [b"page1", b"page2"]
    
    result = await agent.extract(document_content, [])
    
    called_kwargs = mock_factory.execute.call_args.kwargs
    assert called_kwargs["document_content"] == document_content
