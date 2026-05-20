import hashlib
import structlog
from typing import Any

from app.application.dto.extraction_result import ExtractionResult
from app.agents.classifier import DocumentClassifierAgent
from app.agents.section_finder import SectionFinderAgent
from app.agents.extractor import DataExtractionAgent
from app.agents.normalizer import NormalizationAgent

logger = structlog.get_logger("extraction-service")

class ExtractionPipeline:
    """
    Orchestrates the entire extraction process by chaining the agents.
    Calculates overall confidence and implements content-based caching.
    """
    def __init__(
        self,
        classifier: DocumentClassifierAgent,
        section_finder: SectionFinderAgent,
        extractor: DataExtractionAgent,
        normalizer: NormalizationAgent
    ):
        self.classifier = classifier
        self.section_finder = section_finder
        self.extractor = extractor
        self.normalizer = normalizer
        self._cache = {}  # Basic in-memory cache for identical documents

    def _hash_content(self, document_content: Any) -> str:
        """Create a SHA-256 hash of the document content."""
        if isinstance(document_content, bytes):
            return hashlib.sha256(document_content).hexdigest()
        elif isinstance(document_content, list) and all(isinstance(p, bytes) for p in document_content):
            h = hashlib.sha256()
            for p in document_content:
                h.update(p)
            return h.hexdigest()
        # Fallback for unexpected content types
        return str(hash(str(document_content)))

    async def process(self, document_content: Any) -> ExtractionResult:
        doc_hash = self._hash_content(document_content)
        
        # Check cache
        if doc_hash in self._cache:
            logger.info("Returning cached extraction result", doc_hash=doc_hash)
            return self._cache[doc_hash]

        logger.info("Starting pipeline processing", doc_hash=doc_hash)
        
        result = ExtractionResult(
            classification=None,
            sections=[],
            data=None,
            overall_confidence=0.0,
            metadata={"doc_hash": doc_hash}
        )
        
        try:
            # 1. Classification
            logger.info("Pipeline step: Classification")
            classification = await self.classifier.classify(document_content)
            result.classification = classification
            cls_conf = classification.confidence
            
            # 2. Section Finding
            logger.info("Pipeline step: Section Finding")
            sections = await self.section_finder.find_sections(document_content, classification)
            result.sections = sections
            
            sec_conf = 1.0
            if sections:
                sec_conf = sum(s.confidence for s in sections) / len(sections)
                
            # 3. Extraction
            logger.info("Pipeline step: Data Extraction")
            raw_data = await self.extractor.extract(document_content, sections)
            ext_conf = raw_data.confidence_score
            
            # 4. Normalization
            logger.info("Pipeline step: Normalization")
            normalized_data = await self.normalizer.normalize(raw_data)
            result.data = normalized_data
            
            # We assume normalization succeeds if no exception is thrown
            norm_conf = 1.0 
            
            # Calculate overall confidence
            overall = (0.15 * cls_conf) + (0.15 * sec_conf) + (0.50 * ext_conf) + (0.20 * norm_conf)
            result.overall_confidence = round(overall, 4)
            
            logger.info("Pipeline completed successfully", overall_confidence=result.overall_confidence)
            
            # Cache the successful result
            self._cache[doc_hash] = result
            return result
            
        except Exception as e:
            logger.error("Pipeline failed partially", error=str(e), exc_info=True)
            # Set a very low confidence to ensure it gets flagged for human review
            result.overall_confidence = 0.01
            result.metadata["error"] = str(e)
            return result
