import pytest
from unittest.mock import MagicMock, AsyncMock
from fastapi.testclient import TestClient
from app.main import app
from app.application.dto.classification_result import ClassificationResult
from app.application.dto.section import Section
from app.application.dto.raw_financial_data import RawFinancialData
from app.domain.entities.financial_data import FinancialData
from app.infrastructure.ai.provider_factory import ProviderFactory
from app.prompts.loader import PromptLoader

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def mock_provider_factory():
    factory = MagicMock(spec=ProviderFactory)
    factory.execute = AsyncMock()
    factory.provider_order = ["gemini"]
    return factory

@pytest.fixture
def mock_prompt_loader():
    loader = MagicMock(spec=PromptLoader)
    loader.load.return_value = "Test prompt content"
    return loader

@pytest.fixture
def sample_classification():
    return ClassificationResult(
        doc_type="annual_report", confidence=0.92,
        language="en", page_count=30, is_scanned=False
    )

@pytest.fixture
def sample_sections():
    return [
        Section(name="Income Statement", start_page=12, end_page=15, confidence=0.88),
        Section(name="Balance Sheet", start_page=16, end_page=18, confidence=0.91),
    ]

@pytest.fixture
def sample_raw_data():
    return RawFinancialData(
        company_name="Reliance Industries Limited",
        fiscal_year="FY2024-25",
        revenue="₹9,01,180 Cr",
        net_profit="₹79,020 Cr",
        ebitda="₹1,83,580 Cr",
        total_assets="₹19,78,700 Cr",
        total_liabilities="₹11,43,200 Cr",
        currency="Rs.",
        confidence_score=0.87,
        field_confidences={"revenue": 0.92, "net_profit": 0.85, "company_name": 0.98}
    )

@pytest.fixture
def sample_financial_data():
    return FinancialData(
        company_name="Reliance Industries Limited",
        fiscal_year="2024-25",
        revenue=9011800000000.0,
        net_profit=790200000000.0,
        ebitda=1835800000000.0,
        total_assets=19787000000000.0,
        total_liabilities=11432000000000.0,
        currency="INR",
        confidence_score=0.87,
        field_confidences={"revenue": 0.92, "net_profit": 0.85, "company_name": 0.98}
    )
