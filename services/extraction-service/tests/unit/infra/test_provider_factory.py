import pytest
from unittest.mock import patch, AsyncMock
from app.infrastructure.ai.provider_factory import ProviderFactory, CircuitBreaker, AllProvidersFailedError

def test_circuit_breaker_starts_closed():
    cb = CircuitBreaker()
    assert cb.is_open() is False

def test_circuit_breaker_opens_after_threshold():
    cb = CircuitBreaker(failure_threshold=5)
    for _ in range(5):
        cb.record_failure()
    assert cb.is_open() is True

def test_circuit_breaker_stays_closed_below_threshold():
    cb = CircuitBreaker(failure_threshold=5)
    for _ in range(4):
        cb.record_failure()
    assert cb.is_open() is False

def test_circuit_breaker_resets_on_success():
    cb = CircuitBreaker(failure_threshold=5)
    for _ in range(5):
        cb.record_failure()
    assert cb.is_open() is True
    cb.record_success()
    assert cb.is_open() is False

@pytest.mark.asyncio
@patch("app.infrastructure.ai.provider_factory.AnthropicProvider")
@patch("app.infrastructure.ai.provider_factory.OpenAIProvider")
@patch("app.infrastructure.ai.provider_factory.GeminiProvider")
async def test_provider_factory_tries_primary_first(mock_gemini, mock_openai, mock_anthropic):
    with patch.dict("os.environ", {"AI_PROVIDER_GEMINI_ENABLED": "true", "AI_PROVIDER_OPENAI_ENABLED": "true", "AI_PROVIDER_ANTHROPIC_ENABLED": "true", "AI_PROVIDER_ORDER": "gemini,openai,anthropic"}):
        factory = ProviderFactory()
        factory.providers["gemini"].execute = AsyncMock(return_value="Success")
        
        result = await factory.execute("execute")
        assert result == "Success"
        factory.providers["gemini"].execute.assert_called_once()

@pytest.mark.asyncio
@patch("app.infrastructure.ai.provider_factory.AnthropicProvider")
@patch("app.infrastructure.ai.provider_factory.OpenAIProvider")
@patch("app.infrastructure.ai.provider_factory.GeminiProvider")
async def test_provider_factory_fallback_on_failure(mock_gemini, mock_openai, mock_anthropic):
    with patch.dict("os.environ", {"AI_PROVIDER_GEMINI_ENABLED": "true", "AI_PROVIDER_OPENAI_ENABLED": "true", "AI_PROVIDER_ANTHROPIC_ENABLED": "true", "AI_PROVIDER_ORDER": "gemini,openai,anthropic"}):
        factory = ProviderFactory()
        factory.providers["gemini"].execute = AsyncMock(side_effect=Exception("Failed"))
        factory.providers["openai"].execute = AsyncMock(return_value="Fallback Success")
        
        result = await factory.execute("execute")
        assert result == "Fallback Success"
        factory.providers["gemini"].execute.assert_called_once()
        factory.providers["openai"].execute.assert_called_once()

@pytest.mark.asyncio
@patch("app.infrastructure.ai.provider_factory.AnthropicProvider")
@patch("app.infrastructure.ai.provider_factory.OpenAIProvider")
@patch("app.infrastructure.ai.provider_factory.GeminiProvider")
async def test_provider_factory_all_fail_raises(mock_gemini, mock_openai, mock_anthropic):
    with patch.dict("os.environ", {"AI_PROVIDER_GEMINI_ENABLED": "true", "AI_PROVIDER_OPENAI_ENABLED": "true", "AI_PROVIDER_ANTHROPIC_ENABLED": "true", "AI_PROVIDER_ORDER": "gemini,openai,anthropic"}):
        factory = ProviderFactory()
        factory.providers["gemini"].execute = AsyncMock(side_effect=Exception("Failed1"))
        factory.providers["openai"].execute = AsyncMock(side_effect=Exception("Failed2"))
        factory.providers["anthropic"].execute = AsyncMock(side_effect=Exception("Failed3"))
        
        with pytest.raises(AllProvidersFailedError):
            await factory.execute("execute")
