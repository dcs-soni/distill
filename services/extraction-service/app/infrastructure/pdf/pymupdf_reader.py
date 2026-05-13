import fitz  # PyMuPDF
from typing import List, Optional
from app.application.ports.pdf_reader import PdfReader

class PyMuPdfReader(PdfReader):
    def __init__(self, pdf_bytes: bytes):
        self.doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
    def get_page_count(self) -> int:
        return len(self.doc)
        
    def get_page_images(self, start_page: int, end_page: int) -> List[bytes]:
        images = []
        # ensure boundaries
        start = max(0, start_page - 1)
        end = min(len(self.doc) - 1, end_page - 1)
        for page_num in range(start, end + 1):
            page = self.doc.load_page(page_num)
            pix = page.get_pixmap()
            images.append(pix.tobytes("png"))
        return images
        
    def extract_text(self, start_page: Optional[int] = None, end_page: Optional[int] = None) -> str:
        text = ""
        start = max(0, start_page - 1) if start_page is not None else 0
        end = min(len(self.doc) - 1, end_page - 1) if end_page is not None else len(self.doc) - 1
        for page_num in range(start, end + 1):
            page = self.doc.load_page(page_num)
            text += page.get_text() + "\n"
        return text
        
    def is_scanned(self) -> bool:
        if len(self.doc) == 0:
            return False
        # Sample first few pages to avoid extracting whole document just for detection
        sample_pages = min(3, len(self.doc))
        text_len = len(self.extract_text(1, sample_pages))
        # Heuristic: if less than 50 chars per page on average, it's likely scanned
        return (text_len / sample_pages) < 50
