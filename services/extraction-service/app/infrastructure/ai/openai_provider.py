import os
import json
import base64
import structlog
import fitz  # PyMuPDF
from typing import Any, List, Type
from pydantic import BaseModel
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

from openai import AsyncOpenAI, APIError, RateLimitError

from app.application.ports.ai_provider import AIProvider
from app.application.dto.classification_result import ClassificationResult
from app.application.dto.section import Section

logger = structlog.get_logger("extraction-service")

class OpenAIProvider(AIProvider):
    """
    Fallback AI provider utilizing OpenAI models (e.g., GPT-4o).
    Converts PDFs to images for vision tasks and uses native structured outputs.
    """
    
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            logger.warning("OPENAI_API_KEY is not set. OpenAIProvider will fail if invoked.")
            
        self.client = AsyncOpenAI(api_key=self.api_key, timeout=45.0)
        self.vision_model = "gpt-4o"
        self.extraction_model = "gpt-4o"
        
        # Approximate cost (e.g., $5.00 / 1M input tokens, $15.00 / 1M output tokens for gpt-4o)
        self.cost_per_1k_input = 0.005
        self.cost_per_1k_output = 0.015

    def _track_usage(self, response: Any, operation: str) -> None:
        """Track and log token usage and estimated cost for a given operation."""
        if hasattr(response, 'usage') and response.usage:
            prompt_tokens = response.usage.prompt_tokens
            completion_tokens = response.usage.completion_tokens
            total_tokens = response.usage.total_tokens
            
            cost = (prompt_tokens / 1000) * self.cost_per_1k_input + (completion_tokens / 1000) * self.cost_per_1k_output
            
            logger.info(
                "openai_api_usage",
                operation=operation,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                estimated_cost_usd=round(cost, 6)
            )

    def _convert_pdf_to_base64_images(self, document_content: Any) -> List[str]:
        """
        Convert PDF bytes to a list of base64-encoded JPEG images.
        If the content is already a list of images or text, adapt accordingly.
        """
        if isinstance(document_content, bytes):
            # Assume it's a PDF stream
            doc = fitz.open(stream=document_content, filetype="pdf")
            base64_images = []
            for page in doc:
                # scale to reduce resolution and save tokens (matrix=fitz.Matrix(2, 2) if needed)
                pix = page.get_pixmap()
                img_bytes = pix.tobytes("jpeg")
                b64_img = base64.b64encode(img_bytes).decode('utf-8')
                base64_images.append(b64_img)
            return base64_images
        
        # If it's already a list of base64 strings, just return it
        if isinstance(document_content, list):
            return document_content
            
        raise ValueError("Unsupported document_content format for OpenAIProvider")

    def _build_vision_messages(self, prompt: str, base64_images: List[str]) -> List[dict]:
        """Construct the messages array with text and images for OpenAI Vision."""
        content = [{"type": "text", "text": prompt}]
        for b64 in base64_images:
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{b64}",
                    "detail": "high"
                }
            })
        return [{"role": "user", "content": content}]

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(5),
        retry=retry_if_exception_type((APIError, RateLimitError))
    )
    async def classify_document(self, document_content: Any, prompt: str = None) -> ClassificationResult:
        images = self._convert_pdf_to_base64_images(document_content)
        prompt = prompt or "Analyze the provided document images and classify its type based on the schema."
        messages = self._build_vision_messages(prompt, images)

        response = await self.client.beta.chat.completions.parse(
            model=self.vision_model,
            messages=messages,
            response_format=ClassificationResult,
            temperature=0.1
        )
        
        self._track_usage(response, "classify_document")
        return response.choices[0].message.parsed

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(5),
        retry=retry_if_exception_type((APIError, RateLimitError))
    )
    async def find_sections(self, document_content: Any) -> List[Section]:
        images = self._convert_pdf_to_base64_images(document_content)
        prompt = (
            "Analyze the provided document and identify all relevant financial sections "
            "(e.g., Income Statement, Balance Sheet, Cash Flow Statement, Notes to Accounts)."
        )
        messages = self._build_vision_messages(prompt, images)
        
        # We wrap the list in a Pydantic model to work well with OpenAI Structured Outputs
        class SectionList(BaseModel):
            sections: List[Section]
            
        response = await self.client.beta.chat.completions.parse(
            model=self.vision_model,
            messages=messages,
            response_format=SectionList,
            temperature=0.1
        )
        
        self._track_usage(response, "find_sections")
        return response.choices[0].message.parsed.sections

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(5),
        retry=retry_if_exception_type((APIError, RateLimitError))
    )
    async def extract_fields(self, document_content: Any, schema: Type[BaseModel]) -> BaseModel:
        images = self._convert_pdf_to_base64_images(document_content)
        prompt = (
            "Extract structured financial fields from the provided document content. "
            "Ensure the output accurately matches the requested schema and includes confidence scores."
        )
        messages = self._build_vision_messages(prompt, images)
        
        response = await self.client.beta.chat.completions.parse(
            model=self.extraction_model,
            messages=messages,
            response_format=schema,
            temperature=0.1
        )
        
        self._track_usage(response, "extract_fields")
        return response.choices[0].message.parsed
