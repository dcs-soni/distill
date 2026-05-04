import os
import json
import structlog
from typing import Any, List, Type
from pydantic import BaseModel
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.application.ports.ai_provider import AIProvider
from app.application.dto.classification_result import ClassificationResult
from app.application.dto.section import Section

logger = structlog.get_logger("extraction-service")

class GeminiProvider(AIProvider):
    """
    Primary AI provider utilizing Google Gemini models.
    Supports asynchronous generation, rate limit retries, token counting, and structured outputs.
    """
    
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            logger.warning("GEMINI_API_KEY is not set. GeminiProvider will fail if invoked.")
            
        # Initialize the new Google GenAI client
        self.client = genai.Client(api_key=self.api_key)
        self.vision_model = "gemini-2.5-flash"
        self.extraction_model = "gemini-2.5-pro"
        
        # Approximate cost per 1k tokens (for logging purposes)
        self.cost_per_1k_tokens = 0.000125

    def _track_usage(self, response: Any, operation: str) -> None:
        """Track and log token usage and estimated cost for a given operation."""
        if hasattr(response, 'usage_metadata') and response.usage_metadata:
            total_tokens = response.usage_metadata.total_token_count
            cost = (total_tokens / 1000) * self.cost_per_1k_tokens
            logger.info(
                "gemini_api_usage",
                operation=operation,
                prompt_tokens=response.usage_metadata.prompt_token_count,
                candidates_tokens=response.usage_metadata.candidates_token_count,
                total_tokens=total_tokens,
                estimated_cost_usd=round(cost, 6)
            )

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(5),
        retry=retry_if_exception_type(APIError)
    )
    async def classify_document(self, document_content: Any, prompt: str = None) -> ClassificationResult:
        """Classify the document using Gemini Vision with structured JSON output."""
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ClassificationResult,
            temperature=0.1
        )
        
        prompt = prompt or "Analyze the provided document and classify its type. Output exactly as the provided JSON schema."
        contents = [prompt, document_content] if not isinstance(document_content, list) else [prompt] + document_content

        response = await self.client.aio.models.generate_content(
            model=self.vision_model,
            contents=contents,
            config=config
        )
        
        self._track_usage(response, "classify_document")
        return ClassificationResult.model_validate_json(response.text)

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(5),
        retry=retry_if_exception_type(APIError)
    )
    async def find_sections(self, document_content: Any) -> List[Section]:
        """Find sections within the document using structured JSON output."""
        prompt = (
            "Analyze the provided document and identify all relevant financial sections "
            "(e.g., Income Statement, Balance Sheet, Cash Flow Statement, Notes to Accounts). "
            "Output a JSON list matching the requested schema."
        )
        
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=list[Section],
            temperature=0.1
        )
        
        contents = [prompt, document_content] if not isinstance(document_content, list) else [prompt] + document_content
        
        response = await self.client.aio.models.generate_content(
            model=self.vision_model,
            contents=contents,
            config=config
        )
        
        self._track_usage(response, "find_sections")
        parsed_data = json.loads(response.text)
        return [Section.model_validate(item) for item in parsed_data]

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(5),
        retry=retry_if_exception_type(APIError)
    )
    async def extract_fields(self, document_content: Any, schema: Type[BaseModel]) -> BaseModel:
        """Extract structured fields based on the dynamically provided Pydantic schema."""
        prompt = (
            "Extract structured financial fields from the provided document content. "
            "Ensure the output accurately matches the requested schema and includes confidence scores."
        )
        
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=schema,
            temperature=0.1
        )
        
        contents = [prompt, document_content] if not isinstance(document_content, list) else [prompt] + document_content
        
        response = await self.client.aio.models.generate_content(
            model=self.extraction_model,
            contents=contents,
            config=config
        )
        
        self._track_usage(response, "extract_fields")
        return schema.model_validate_json(response.text)
