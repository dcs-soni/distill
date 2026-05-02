from typing import Optional
from pydantic import BaseModel, Field

class ClassificationResult(BaseModel):
    doc_type: str = Field(..., description="Type of the document, e.g. annual_report, invoice, etc.")
    confidence: float = Field(..., description="Confidence score of the classification, 0.0 to 1.0")
    language: Optional[str] = Field("en", description="Detected language of the document")
    page_count: Optional[int] = Field(None, description="Total number of pages if determined")
    is_scanned: Optional[bool] = Field(None, description="True if the document is a scanned image, false if native PDF")
