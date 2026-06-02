import pytest
from app.agents.section_finder import SectionFinderAgent
from app.application.dto.section import Section

@pytest.mark.asyncio
async def test_find_sections_uses_classification(mock_provider_factory, mock_prompt_loader, sample_classification):
    agent = SectionFinderAgent(mock_provider_factory, mock_prompt_loader)
    mock_provider_factory.execute.return_value = []
    
    await agent.find_sections(b"PDF", sample_classification)
    
    prompt_used = mock_provider_factory.execute.call_args.kwargs["prompt"]
    assert "Document Type: annual_report" in prompt_used

@pytest.mark.asyncio
async def test_find_sections_chunk_processing_over_20_pages(mock_provider_factory, mock_prompt_loader, sample_classification):
    agent = SectionFinderAgent(mock_provider_factory, mock_prompt_loader)
    # 25 pages
    doc_content = [f"page{i}".encode() for i in range(25)]
    
    # Mock to return section on first page of chunk
    mock_provider_factory.execute.side_effect = [
        [Section(name="Part 1", start_page=1, end_page=2, confidence=0.8)], # Chunk 0-9
        [Section(name="Part 2", start_page=1, end_page=1, confidence=0.9)], # Chunk 10-19
        [Section(name="Part 3", start_page=1, end_page=2, confidence=0.7)], # Chunk 20-24
    ]
    
    result = await agent.find_sections(doc_content, sample_classification)
    
    assert mock_provider_factory.execute.call_count == 3
    # Check page offsets
    assert result[0].start_page == 1   # 0 + 1
    assert result[1].start_page == 11  # 10 + 1
    assert result[2].start_page == 21  # 20 + 1

@pytest.mark.asyncio
async def test_find_sections_exactly_20_pages(mock_provider_factory, mock_prompt_loader, sample_classification):
    agent = SectionFinderAgent(mock_provider_factory, mock_prompt_loader)
    doc_content = [f"page{i}".encode() for i in range(20)]
    mock_provider_factory.execute.return_value = []
    
    await agent.find_sections(doc_content, sample_classification)
    
    # Should not chunk
    assert mock_provider_factory.execute.call_count == 1

def test_merge_sections_adjacent():
    agent = SectionFinderAgent(None, None)
    sections = [
        Section(name="Income", start_page=1, end_page=2, confidence=0.8),
        Section(name="Income", start_page=3, end_page=4, confidence=0.9)
    ]
    merged = agent._merge_sections(sections)
    
    assert len(merged) == 1
    assert merged[0].start_page == 1
    assert merged[0].end_page == 4
    assert merged[0].confidence == pytest.approx(0.85)

def test_merge_sections_different_names():
    agent = SectionFinderAgent(None, None)
    sections = [
        Section(name="Income", start_page=1, end_page=2, confidence=0.8),
        Section(name="Balance", start_page=3, end_page=4, confidence=0.9)
    ]
    merged = agent._merge_sections(sections)
    assert len(merged) == 2
