import pytest
from app.agents.normalizer import NormalizationAgent
from app.application.dto.raw_financial_data import RawFinancialData

def test_parse_numeric():
    agent = NormalizationAgent()
    
    assert agent._parse_numeric("₹1,234.5 Cr") == (12345000000.0, "INR")
    assert agent._parse_numeric("(₹500 Cr)") == (-5000000000.0, "INR")
    assert agent._parse_numeric("-5.2M USD") == (-5200000.0, "USD")
    assert agent._parse_numeric("12,000") == (12000.0, None)
    assert agent._parse_numeric("10 Lakhs") == (1000000.0, None)
    assert agent._parse_numeric("1.5 B") == (1500000000.0, None)
    assert agent._parse_numeric("Rs. 100") == (100.0, "INR")
    assert agent._parse_numeric("15k") == (15000.0, None)
    
def test_normalize_fiscal_year():
    agent = NormalizationAgent()
    
    assert agent._normalize_fiscal_year("FY2024-25") == "2024-25"
    assert agent._normalize_fiscal_year("2024-25") == "2024-25"
    assert agent._normalize_fiscal_year("FY24") == "2023-24"
    assert agent._normalize_fiscal_year("March 2024") == "2023-24"
    assert agent._normalize_fiscal_year("Unknown") == "UNKNOWN"

@pytest.mark.asyncio
async def test_normalize_agent():
    agent = NormalizationAgent()
    
    raw = RawFinancialData(
        company_name="Test Corp ",
        fiscal_year="FY24",
        revenue="(₹500 Cr)",
        net_profit="10 Lakhs",
        ebitda=None,
        total_assets="1.5 B",
        total_liabilities="-12,000",
        currency="Rs.",
        confidence_score=0.9
    )
    
    result = await agent.normalize(raw)
    
    assert result.company_name == "Test Corp"
    assert result.fiscal_year == "2023-24"
    assert result.revenue == -5000000000.0
    assert result.net_profit == 1000000.0
    assert result.ebitda is None
    assert result.total_assets == 1500000000.0
    assert result.total_liabilities == -12000.0
    assert result.currency == "INR"
    assert result.confidence_score == 0.9
