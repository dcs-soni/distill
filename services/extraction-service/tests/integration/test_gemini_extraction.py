import pytest
from app.infrastructure.ai.gemini_provider import GeminiProvider
from app.application.dto.classification_result import ClassificationResult
from .conftest import requires_api

@requires_api
@pytest.mark.asyncio
async def test_gemini_classify_document():
    provider = GeminiProvider()
    
    # Minimal PDF structure just for API shape testing
    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <<>> /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 0 >>\nstream\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000213 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n264\n%%EOF"
    
    prompt = "Return a classification result. Assume this is an invoice."
    
    result = await provider.classify_document(pdf_bytes, prompt)
    
    assert isinstance(result, ClassificationResult)
    assert result.doc_type is not None
    assert result.confidence > 0.0
