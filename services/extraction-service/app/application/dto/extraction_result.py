from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.domain.entities.financial_data import FinancialData
from .section import Section
from .classification_result import ClassificationResult

class ExtractionResult(BaseModel):
    classification: Optional[ClassificationResult] = Field(None, description="Document classification details")
    sections: List[Section] = Field(default_factory=list, description="Found sections within the document")
    data: Optional[FinancialData] = Field(None, description="Extracted structured financial data")
    overall_confidence: float = Field(..., description="Aggregated confidence across the entire pipeline")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional processing metadata (e.g. processing time, token count)")
