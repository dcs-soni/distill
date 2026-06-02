import pytest
from app.agents.classifier import DocumentClassifierAgent
from app.application.dto.classification_result import ClassificationResult
from app.infrastructure.ai.provider_factory import AllProvidersFailedError

@pytest.mark.asyncio
async def test_classify_uses_prompt_loader(mock_provider_factory, mock_prompt_loader):
    agent = DocumentClassifierAgent(mock_provider_factory, mock_prompt_loader)
    mock_provider_factory.execute.return_value = ClassificationResult(doc_type="annual_report", confidence=0.9)
    
    await agent.classify(b"PDF_BYTES")
    
    mock_prompt_loader.load.assert_called_once_with("classify")

@pytest.mark.asyncio
async def test_classify_prompt_not_found_uses_fallback(mock_provider_factory, mock_prompt_loader):
    mock_prompt_loader.load.side_effect = FileNotFoundError()
    agent = DocumentClassifierAgent(mock_provider_factory, mock_prompt_loader)
    mock_provider_factory.execute.return_value = ClassificationResult(doc_type="annual_report", confidence=0.9)
    
    await agent.classify(b"PDF_BYTES")
    
    # Should use fallback prompt
    args = mock_provider_factory.execute.call_args.kwargs
    assert args["prompt"] == "Classify the provided financial document."

@pytest.mark.asyncio
async def test_classify_provider_factory_called(mock_provider_factory, mock_prompt_loader):
    agent = DocumentClassifierAgent(mock_provider_factory, mock_prompt_loader)
    mock_provider_factory.execute.return_value = ClassificationResult(doc_type="annual_report", confidence=0.9)
    
    result = await agent.classify(b"PDF_BYTES")
    
    mock_provider_factory.execute.assert_called_once()
    called_args = mock_provider_factory.execute.call_args
    assert called_args.args[0] == "classify_document"
    assert called_args.kwargs["document_content"] == b"PDF_BYTES"
    assert called_args.kwargs["prompt"] == "Test prompt content"
    
    assert result.doc_type == "annual_report"
    assert result.confidence == 0.9

@pytest.mark.asyncio
async def test_classify_provider_failure_propagates(mock_provider_factory, mock_prompt_loader):
    mock_provider_factory.execute.side_effect = AllProvidersFailedError("Failure")
    agent = DocumentClassifierAgent(mock_provider_factory, mock_prompt_loader)
    
    with pytest.raises(AllProvidersFailedError):
        await agent.classify(b"PDF_BYTES")
