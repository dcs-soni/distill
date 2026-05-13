import os
import structlog
from typing import Any, List

from app.application.dto.classification_result import ClassificationResult
from app.application.dto.section import Section
from app.infrastructure.ai.provider_factory import ProviderFactory
from app.prompts.loader import PromptLoader

logger = structlog.get_logger("extraction-service")

class SectionFinderAgent:
    """
    Agent responsible for finding relevant sections within a document.
    Uses the AI Provider Factory to identify sections and their page ranges.
    """
    
    def __init__(self, provider_factory: ProviderFactory, prompt_loader: PromptLoader = None):
        self.provider_factory = provider_factory
        self.prompt_loader = prompt_loader or PromptLoader()
        
    def _load_prompt(self) -> str:
        """Load the section finder prompt from the prompts directory."""
        try:
            return self.prompt_loader.load("find_sections")
        except FileNotFoundError:
            logger.error("Prompt file not found for find_sections")
            return "Identify all relevant financial sections. Output a JSON list of sections."

    async def find_sections(self, document_content: Any, classification: ClassificationResult) -> List[Section]:
        """
        Finds sections in the document content. For documents over 20 pages,
        processes them in chunks to reduce token usage.
        
        Args:
            document_content: The bytes or images of the document pages.
            classification: The classification result of the document.
            
        Returns:
            List of identified sections.
        """
        prompt = self._load_prompt()
        enhanced_prompt = f"{prompt}\nDocument Type: {classification.doc_type}\n"
        
        # Check if we can do chunk processing (if document_content is a list of pages)
        if isinstance(document_content, list) and len(document_content) > 20:
            logger.info("Document > 20 pages, using chunk processing", pages=len(document_content))
            return await self._process_in_chunks(document_content, enhanced_prompt)
            
        logger.info("Starting section finder", pages=len(document_content) if isinstance(document_content, list) else "unknown")
        
        result = await self.provider_factory.execute(
            "find_sections", 
            document_content=document_content,
            prompt=enhanced_prompt
        )
        
        logger.info("Section finding complete", num_sections=len(result))
        
        return result

    async def _process_in_chunks(self, document_content: List[Any], base_prompt: str) -> List[Section]:
        """Process document in batches of 10 pages."""
        all_sections: List[Section] = []
        batch_size = 10
        
        for i in range(0, len(document_content), batch_size):
            chunk = document_content[i:i+batch_size]
            chunk_prompt = f"{base_prompt}\nNote: This is a chunk of the document. Assume the first page in this chunk is page 1, and return relative page numbers."
            
            try:
                logger.info(f"Processing chunk {i//batch_size + 1}")
                sections = await self.provider_factory.execute(
                    "find_sections",
                    document_content=chunk,
                    prompt=chunk_prompt
                )
                
                # Adjust page numbers to be absolute
                for sec in sections:
                    sec.start_page += i
                    sec.end_page += i
                    all_sections.append(sec)
                    
            except Exception as e:
                logger.error("Failed to process chunk for sections", offset=i, error=str(e))
                
        return self._merge_sections(all_sections)

    def _merge_sections(self, sections: List[Section]) -> List[Section]:
        """Merge consecutive sections with the same name that span across chunks."""
        if not sections:
            return []
            
        sections.sort(key=lambda x: x.start_page)
        merged = []
        current = sections[0]
        
        for next_sec in sections[1:]:
            # If sections have the same name and are adjacent or overlapping
            if next_sec.name.lower() == current.name.lower() and next_sec.start_page <= current.end_page + 1:
                current.end_page = max(current.end_page, next_sec.end_page)
                current.confidence = (current.confidence + next_sec.confidence) / 2.0
            else:
                merged.append(current)
                current = next_sec
                
        merged.append(current)
        return merged
