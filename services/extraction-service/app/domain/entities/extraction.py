from typing import Optional, Dict, Any

class Extraction:
    def __init__(
        self,
        id: str,
        tenant_id: str,
        document_id: str,
        version: int,
        confidence: float,
        provider_used: str,
        model_used: str,
        prompt_version: str,
        processing_time_ms: int,
        token_count: int,
        cost_usd: float = 0.0,
    ):
        self.id = id
        self.tenant_id = tenant_id
        self.document_id = document_id
        self.version = version
        self.confidence = confidence
        self.provider_used = provider_used
        self.model_used = model_used
        self.prompt_version = prompt_version
        self.processing_time_ms = processing_time_ms
        self.token_count = token_count
        self.cost_usd = cost_usd

    def calculate_cost(self, cost_per_1k_tokens: float) -> float:
        """Calculate the cost based on token count and a given rate per 1k tokens."""
        calculated_cost = (self.token_count / 1000) * cost_per_1k_tokens
        self.cost_usd = round(calculated_cost, 6)
        return self.cost_usd

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "document_id": self.document_id,
            "version": self.version,
            "confidence": self.confidence,
            "provider_used": self.provider_used,
            "model_used": self.model_used,
            "prompt_version": self.prompt_version,
            "processing_time_ms": self.processing_time_ms,
            "token_count": self.token_count,
            "cost_usd": self.cost_usd,
        }
