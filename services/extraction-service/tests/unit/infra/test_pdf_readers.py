import pytest
import io
from app.infrastructure.pdf.pdfplumber_reader import PdfPlumberReader
from app.infrastructure.pdf.pymupdf_reader import PyMuPdfReader

# A tiny valid PDF file for testing (empty page)
TINY_PDF = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <<>> /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 0 >>\nstream\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000213 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n264\n%%EOF"

def test_pymupdf_reader():
    reader = PyMuPdfReader(TINY_PDF)
    assert reader.get_page_count() == 1
    
    text = reader.extract_text()
    assert isinstance(text, str)
    
    images = reader.get_page_images(1, 1)
    assert len(images) == 1
    assert isinstance(images[0], bytes)
    
    assert reader.is_scanned() is True # empty text -> scanned heuristic returns True

def test_pdfplumber_reader():
    reader = PdfPlumberReader(TINY_PDF)
    assert reader.get_page_count() == 1
    
    text = reader.extract_text()
    assert isinstance(text, str)
    
    images = reader.get_page_images(1, 1)
    assert len(images) == 1
    assert isinstance(images[0], bytes)
