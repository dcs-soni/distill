from abc import ABC, abstractmethod
from typing import List, Optional

class PdfReader(ABC):
    """Abstract base class for PDF Reader Adapters."""

    @abstractmethod
    def get_page_count(self) -> int:
        pass

    @abstractmethod
    def get_page_images(self, start_page: int, end_page: int) -> List[bytes]:
        """Return a list of page images (e.g. PNG bytes) for the given page range."""
        pass

    @abstractmethod
    def extract_text(self, start_page: Optional[int] = None, end_page: Optional[int] = None) -> str:
        """Extract text from the given page range."""
        pass

    @abstractmethod
    def is_scanned(self) -> bool:
        """Detect if the document is primarily scanned (images without much text)."""
        pass
