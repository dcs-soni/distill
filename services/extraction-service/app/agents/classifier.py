import os
import structlog
from typing import Any

from app.application.dto.classification_result import ClassificationResult
from app.infrastructure.ai.provider_factory import ProviderFactory
from app.prompts.loader import PromptLoader

logger = structlog.get_logger("extraction-service")

class DocumentClassifierAgent:
    """
    Agent responsible for classifying documents before extraction.
    Uses the AI Provider Factory to execute the classification using vision models.
    """
    
    def __init__(self, provider_factory: ProviderFactory, prompt_loader: PromptLoader = None):
        self.provider_factory = provider_factory
        self.prompt_loader = prompt_loader or PromptLoader()
        
    def _load_prompt(self) -> str:
        """Load the classification prompt from the prompts directory."""
        try:
            return self.prompt_loader.load("classify")
        except FileNotFoundError:
            logger.error("Prompt file not found for classify")
            # Fallback prompt just in case
            return "Classify the provided financial document."

    async def classify(self, document_content: Any) -> ClassificationResult:
        """
        Classifies the given document content using the configured AI provider chain.
        
        Args:
            document_content: The bytes or images of the document.
            
        Returns:
            ClassificationResult containing doc_type, confidence, etc.
        """
        prompt = self._load_prompt()
        
        logger.info("Starting document classification")
        
        # We pass the document content and the loaded prompt to the AI provider. 
        # The ProviderFactory will try configured providers in order.
        result = await self.provider_factory.execute(
            "classify_document", 
            document_content=document_content,
            prompt=prompt
        )
        
        logger.info(
            "Document classification complete", 
            doc_type=result.doc_type, 
            confidence=result.confidence
        )
        
        return result
