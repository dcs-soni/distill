import os
import time
import structlog
from typing import Any, List, Dict, Callable
from pydantic import BaseModel
from prometheus_client import Counter, Histogram, Gauge

from app.application.ports.ai_provider import AIProvider
from app.infrastructure.ai.gemini_provider import GeminiProvider
from app.infrastructure.ai.openai_provider import OpenAIProvider
from app.infrastructure.ai.anthropic_provider import AnthropicProvider

logger = structlog.get_logger("extraction-service")

# Prometheus Metrics
PROVIDER_REQUEST_COUNT = Counter(
    "ai_provider_requests_total", 
    "Total requests to AI providers", 
    ["provider", "operation", "status"]
)
PROVIDER_LATENCY = Histogram(
    "ai_provider_latency_seconds", 
    "Latency of AI provider requests", 
    ["provider", "operation"]
)
PROVIDER_CIRCUIT_BREAKER = Gauge(
    "ai_provider_circuit_breaker_status", 
    "Status of the circuit breaker for a provider (0=Closed/Healthy, 1=Open/Tripped)", 
    ["provider"]
)

class AllProvidersFailedError(Exception):
    """Raised when all configured AI providers fail to execute an operation."""
    pass

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 120):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failures = 0
        self.last_failure_time = 0.0

    def record_failure(self):
        self.failures += 1
        self.last_failure_time = time.time()

    def record_success(self):
        self.failures = 0
        self.last_failure_time = 0.0

    def is_open(self) -> bool:
        if self.failures >= self.failure_threshold:
            if time.time() - self.last_failure_time > self.recovery_timeout:
                # Half-open state: allow to try again
                self.failures = self.failure_threshold - 1
                return False
            return True
        return False

class ProviderFactory:
    """
    Factory that manages a chain of AI providers with fallback and circuit breaking.
    """
    
    def __init__(self):
        self.providers: Dict[str, AIProvider] = {}
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.provider_order: List[str] = []
        
        self._initialize_providers()

    def _initialize_providers(self):
        # Load enable flags
        gemini_enabled = os.getenv("AI_PROVIDER_GEMINI_ENABLED", "true").lower() == "true"
        openai_enabled = os.getenv("AI_PROVIDER_OPENAI_ENABLED", "true").lower() == "true"
        anthropic_enabled = os.getenv("AI_PROVIDER_ANTHROPIC_ENABLED", "true").lower() == "true"
        
        available = {}
        if gemini_enabled:
            available["gemini"] = GeminiProvider()
        if openai_enabled:
            available["openai"] = OpenAIProvider()
        if anthropic_enabled:
            available["anthropic"] = AnthropicProvider()
            
        # Parse order
        order_str = os.getenv("AI_PROVIDER_ORDER", "gemini,openai,anthropic")
        order = [p.strip().lower() for p in order_str.split(",")]
        
        for name in order:
            if name in available:
                self.providers[name] = available[name]
                self.circuit_breakers[name] = CircuitBreaker(failure_threshold=5, recovery_timeout=120)
                self.provider_order.append(name)
                PROVIDER_CIRCUIT_BREAKER.labels(provider=name).set(0)
                
        if not self.provider_order:
            logger.warning("No AI providers configured or enabled!")

    async def execute(self, method_name: str, *args, **kwargs) -> Any:
        """
        Execute a method on the providers in order, falling back on failure.
        """
        last_exception = None
        
        for provider_name in self.provider_order:
            breaker = self.circuit_breakers[provider_name]
            
            if breaker.is_open():
                PROVIDER_CIRCUIT_BREAKER.labels(provider=provider_name).set(1)
                logger.warning(f"Circuit breaker open for {provider_name}, skipping.")
                continue
                
            PROVIDER_CIRCUIT_BREAKER.labels(provider=provider_name).set(0)
            provider = self.providers[provider_name]
            method = getattr(provider, method_name, None)
            
            if not method or not isinstance(method, Callable):
                logger.error(f"Method {method_name} not found on {provider_name}")
                continue
                
            start_time = time.time()
            try:
                logger.info(f"Attempting {method_name} with {provider_name}")
                result = await method(*args, **kwargs)
                
                latency = time.time() - start_time
                PROVIDER_LATENCY.labels(provider=provider_name, operation=method_name).observe(latency)
                PROVIDER_REQUEST_COUNT.labels(provider=provider_name, operation=method_name, status="success").inc()
                
                breaker.record_success()
                return result
                
            except Exception as e:
                latency = time.time() - start_time
                logger.error(
                    f"Provider {provider_name} failed on {method_name}", 
                    error=str(e), 
                    latency=latency
                )
                PROVIDER_LATENCY.labels(provider=provider_name, operation=method_name).observe(latency)
                PROVIDER_REQUEST_COUNT.labels(provider=provider_name, operation=method_name, status="failure").inc()
                
                breaker.record_failure()
                last_exception = e
                
        # If we exhausted all providers
        logger.error(f"All AI providers failed for {method_name}")
        raise AllProvidersFailedError(f"All providers failed for {method_name}. Last error: {str(last_exception)}")
