import pdfplumber
import io
from typing import List, Optional
from app.application.ports.pdf_reader import PdfReader

class PdfPlumberReader(PdfReader):
    def __init__(self, pdf_bytes: bytes):
        self.pdf_bytes = pdf_bytes
        
    def _open(self):
        return pdfplumber.open(io.BytesIO(self.pdf_bytes))
        
    def get_page_count(self) -> int:
        with self._open() as pdf:
            return len(pdf.pages)
            
    def get_page_images(self, start_page: int, end_page: int) -> List[bytes]:
        images = []
        with self._open() as pdf:
            start = max(0, start_page - 1)
            end = min(len(pdf.pages) - 1, end_page - 1)
            for page_num in range(start, end + 1):
                page = pdf.pages[page_num]
                im = page.to_image(resolution=150)
                img_byte_arr = io.BytesIO()
                im.save(img_byte_arr, format='PNG')
                images.append(img_byte_arr.getvalue())
        return images
        
    def extract_text(self, start_page: Optional[int] = None, end_page: Optional[int] = None) -> str:
        text = ""
        with self._open() as pdf:
            start = max(0, start_page - 1) if start_page is not None else 0
            end = min(len(pdf.pages) - 1, end_page - 1) if end_page is not None else len(pdf.pages) - 1
            for page_num in range(start, end + 1):
                page = pdf.pages[page_num]
                # extract text with layout preserved for tables
                page_text = page.extract_text(layout=True)
                if page_text:
                    text += page_text + "\n"
        return text
        
    def is_scanned(self) -> bool:
        # Sample first few pages to avoid full extraction
        count = self.get_page_count()
        if count == 0:
            return False
        sample_pages = min(3, count)
        text_len = len(self.extract_text(1, sample_pages))
        return (text_len / sample_pages) < 50
