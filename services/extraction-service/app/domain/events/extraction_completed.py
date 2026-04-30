from typing import Dict, Any, Optional
from datetime import datetime, timezone
import uuid

class ExtractionCompletedEvent:
    def __init__(
        self,
        document_id: str,
        tenant_id: str,
        extraction_id: str,
        confidence: float,
        provider_used: str,
        correlation_id: Optional[str] = None
    ):
        self.event_id = str(uuid.uuid4())
        self.event_type = "ExtractionCompletedEvent"
        self.timestamp = datetime.now(timezone.utc).isoformat()
        self.document_id = document_id
        self.tenant_id = tenant_id
        self.extraction_id = extraction_id
        self.confidence = confidence
        self.provider_used = provider_used
        self.correlation_id = correlation_id or str(uuid.uuid4())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "eventId": self.event_id,
            "eventType": self.event_type,
            "timestamp": self.timestamp,
            "tenantId": self.tenant_id,
            "correlationId": self.correlation_id,
            "documentId": self.document_id,
            "extractionId": self.extraction_id,
            "confidence": self.confidence,
            "providerUsed": self.provider_used
        }
