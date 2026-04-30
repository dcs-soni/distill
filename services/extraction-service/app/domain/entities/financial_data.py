from typing import Optional, Dict
from pydantic import BaseModel, Field

class FinancialData(BaseModel):
    company_name: Optional[str] = Field(None, description="The name of the company")
    fiscal_year: Optional[str] = Field(None, description="The fiscal year of the report")
    revenue: Optional[float] = Field(None, description="Total revenue")
    net_profit: Optional[float] = Field(None, description="Net profit")
    ebitda: Optional[float] = Field(None, description="EBITDA")
    total_assets: Optional[float] = Field(None, description="Total assets")
    total_liabilities: Optional[float] = Field(None, description="Total liabilities")
    currency: Optional[str] = Field(None, description="Currency code (e.g. USD, INR)")
    confidence_score: float = Field(..., description="Overall confidence score of the extraction")
    field_confidences: Dict[str, float] = Field(default_factory=dict, description="Confidence scores for individual fields")
