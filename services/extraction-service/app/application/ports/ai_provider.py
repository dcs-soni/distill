from abc import ABC, abstractmethod
from typing import Any, List, Type
from pydantic import BaseModel

from app.application.dto.classification_result import ClassificationResult
from app.application.dto.section import Section
from app.application.dto.extraction_result import ExtractionResult

class AIProvider(ABC):
    """
    Abstract interface for AI Providers (e.g., Gemini, OpenAI, Anthropic).
    Provides methods for classifying documents, finding sections, and extracting structured fields.
    """
    
    @abstractmethod
    async def classify_document(self, document_content: Any, prompt: str = None) -> ClassificationResult:
        """
        Classify the given document content.
        
        Args:
            document_content: The content of the document (format depends on the implementation).
            
        Returns:
            ClassificationResult: Containing document type, confidence, etc.
        """
        pass
        
    @abstractmethod
    async def find_sections(self, document_content: Any) -> List[Section]:
        """
        Find relevant sections within the document.
        
        Args:
            document_content: The content of the document.
            
        Returns:
            List[Section]: List of sections found within the document.
        """
        pass
        
    @abstractmethod
    async def extract_fields(self, document_content: Any, schema: Type[BaseModel]) -> BaseModel:
        """
        Extract structured fields from the document based on a provided Pydantic schema.
        
        Args:
            document_content: The targeted content of the document (could be specific pages).
            schema: A Pydantic BaseModel class defining the expected output structure.
            
        Returns:
            BaseModel: An instance of the provided schema populated with extracted data.
        """
        pass
