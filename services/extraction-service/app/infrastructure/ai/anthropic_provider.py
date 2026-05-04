import os
import base64
import structlog
import fitz  # PyMuPDF
from typing import Any, List, Type
from pydantic import BaseModel
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

from anthropic import AsyncAnthropic, APIError, RateLimitError

from app.application.ports.ai_provider import AIProvider
from app.application.dto.classification_result import ClassificationResult
from app.application.dto.section import Section

logger = structlog.get_logger("extraction-service")

class AnthropicProvider(AIProvider):
    """
    Fallback AI provider utilizing Anthropic models (e.g., Claude 3.5 Sonnet).
    Converts PDFs to images for vision tasks and uses tool-use for structured outputs.
    """
    
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            logger.warning("ANTHROPIC_API_KEY is not set. AnthropicProvider will fail if invoked.")
            
        self.client = AsyncAnthropic(api_key=self.api_key, timeout=45.0)
        # Claude 3.5 Sonnet for high reasoning and extraction tasks
        self.model = "claude-3-5-sonnet-20241022" 
        
        # Approximate cost (e.g., $3.00 / 1M input tokens, $15.00 / 1M output tokens for sonnet 3.5)
        self.cost_per_1k_input = 0.003
        self.cost_per_1k_output = 0.015

    def _track_usage(self, response: Any, operation: str) -> None:
        """Track and log token usage and estimated cost for a given operation."""
        if hasattr(response, 'usage') and response.usage:
            prompt_tokens = response.usage.input_tokens
            completion_tokens = response.usage.output_tokens
            total_tokens = prompt_tokens + completion_tokens
            
            cost = (prompt_tokens / 1000) * self.cost_per_1k_input + (completion_tokens / 1000) * self.cost_per_1k_output
            
            logger.info(
                "anthropic_api_usage",
                operation=operation,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                estimated_cost_usd=round(cost, 6)
            )

    def _convert_pdf_to_base64_images(self, document_content: Any) -> List[str]:
        """
        Convert PDF bytes to a list of base64-encoded JPEG images.
        """
        if isinstance(document_content, bytes):
            # Assume it's a PDF stream
            doc = fitz.open(stream=document_content, filetype="pdf")
            base64_images = []
            for page in doc:
                pix = page.get_pixmap()
                img_bytes = pix.tobytes("jpeg")
                b64_img = base64.b64encode(img_bytes).decode('utf-8')
                base64_images.append(b64_img)
            return base64_images
        
        if isinstance(document_content, list):
            return document_content
            
        raise ValueError("Unsupported document_content format for AnthropicProvider")

    def _build_vision_messages(self, prompt: str, base64_images: List[str]) -> List[dict]:
        """Construct the messages array with text and images for Anthropic Vision."""
        content = []
        for b64 in base64_images:
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/jpeg",
                    "data": b64
                }
            })
        content.append({"type": "text", "text": prompt})
        return [{"role": "user", "content": content}]

    def _get_tool_definition(self, schema: Type[BaseModel]) -> dict:
        """Generate a tool definition from a Pydantic schema."""
        return {
            "name": schema.__name__,
            "description": f"Output the extracted {schema.__name__} data",
            "input_schema": schema.model_json_schema()
        }

    def _extract_parsed_result(self, response: Any, schema: Type[BaseModel]) -> BaseModel:
        """Extract the parsed result from the tool_use block in the Anthropic response."""
        for block in response.content:
            if block.type == "tool_use" and block.name == schema.__name__:
                return schema(**block.input)
        raise ValueError(f"No tool_use block found for {schema.__name__}")

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(5),
        retry=retry_if_exception_type((APIError, RateLimitError))
    )
    async def classify_document(self, document_content: Any, prompt: str = None) -> ClassificationResult:
        images = self._convert_pdf_to_base64_images(document_content)
        prompt = prompt or "Analyze the provided document images and classify its type based on the schema."
        messages = self._build_vision_messages(prompt, images)

        tool = self._get_tool_definition(ClassificationResult)
        
        response = await self.client.messages.create(
            model=self.model,
            messages=messages,
            tools=[tool],
            tool_choice={"type": "tool", "name": tool["name"]},
            max_tokens=1024,
            temperature=0.1
        )
        
        self._track_usage(response, "classify_document")
        return self._extract_parsed_result(response, ClassificationResult)

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
        
        class SectionList(BaseModel):
            sections: List[Section]
            
        tool = self._get_tool_definition(SectionList)

        response = await self.client.messages.create(
            model=self.model,
            messages=messages,
            tools=[tool],
            tool_choice={"type": "tool", "name": tool["name"]},
            max_tokens=2048,
            temperature=0.1
        )
        
        self._track_usage(response, "find_sections")
        parsed = self._extract_parsed_result(response, SectionList)
        return parsed.sections

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
        
        tool = self._get_tool_definition(schema)
        
        response = await self.client.messages.create(
            model=self.model,
            messages=messages,
            tools=[tool],
            tool_choice={"type": "tool", "name": tool["name"]},
            max_tokens=4096,
            temperature=0.1
        )
        
        self._track_usage(response, "extract_fields")
        return self._extract_parsed_result(response, schema)
