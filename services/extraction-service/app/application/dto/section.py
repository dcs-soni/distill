from pydantic import BaseModel, Field

class Section(BaseModel):
    name: str = Field(..., description="Name of the section, e.g., Income Statement, Balance Sheet")
    start_page: int = Field(..., description="Starting page number of the section (1-indexed)")
    end_page: int = Field(..., description="Ending page number of the section (1-indexed)")
    confidence: float = Field(..., description="Confidence score for section boundaries")
