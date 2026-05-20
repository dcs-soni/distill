import structlog
from typing import Any, List
from app.infrastructure.ai.provider_factory import ProviderFactory
from app.prompts.loader import PromptLoader
from app.application.dto.section import Section
from app.application.dto.raw_financial_data import RawFinancialData

logger = structlog.get_logger("extraction-service")

class DataExtractionAgent:
    """
    Agent responsible for extracting structured financial data from targeted sections.
    """
    def __init__(self, provider_factory: ProviderFactory, prompt_loader: PromptLoader = None):
        self.provider_factory = provider_factory
        self.prompt_loader = prompt_loader or PromptLoader()

    def _load_prompt(self) -> str:
        try:
            return self.prompt_loader.load("extract_annual_report")
        except FileNotFoundError:
            logger.error("Prompt file not found for extract_annual_report")
            return "Extract financial data into the requested JSON schema."

    async def extract(self, document_content: Any, sections: List[Section]) -> RawFinancialData:
        prompt = self._load_prompt()
        
        # Determine the target pages from sections
        target_pages = set()
        for sec in sections:
            # start_page to end_page inclusive. Sections are 1-indexed.
            for p in range(sec.start_page, sec.end_page + 1):
                target_pages.add(p)
                
        # If document_content is a list of bytes (images)
        if isinstance(document_content, list) and len(document_content) > 0:
            if not target_pages:
                logger.warning("No sections found, processing entire document")
                targeted_content = document_content
            else:
                sorted_pages = sorted(list(target_pages))
                logger.info("Targeted pages for extraction", pages=sorted_pages)
                # target_pages are 1-indexed, Python lists are 0-indexed
                targeted_content = []
                for p in sorted_pages:
                    idx = p - 1
                    if 0 <= idx < len(document_content):
                        targeted_content.append(document_content[idx])
        else:
            # Maybe it's just bytes and we can't slice it here, pass as is
            logger.info("Content is not a list of pages, passing as is")
            targeted_content = document_content

        logger.info(
            "Starting data extraction", 
            num_pages=len(targeted_content) if isinstance(targeted_content, list) else "unknown"
        )
        
        # We pass RawFinancialData as the schema to enforce structured output
        result: RawFinancialData = await self.provider_factory.execute(
            "extract_fields",
            document_content=targeted_content,
            schema=RawFinancialData,
            prompt=prompt
        )
        
        logger.info(
            "Data extraction complete", 
            company=result.company_name, 
            confidence=result.confidence_score
        )
        
        return result
