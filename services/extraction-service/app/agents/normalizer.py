import re
import structlog
from typing import Tuple, Optional

from app.application.dto.raw_financial_data import RawFinancialData
from app.domain.entities.financial_data import FinancialData

logger = structlog.get_logger("extraction-service")

class NormalizationAgent:
    """
    Agent responsible for standardizing raw strings extracted by the AI 
    into strictly typed floats and standardized codes.
    """

    def __init__(self):
        self.currency_map = {
            "₹": "INR", "rs.": "INR", "rs": "INR", "inr": "INR",
            "$": "USD", "usd": "USD",
            "£": "GBP", "gbp": "GBP",
            "€": "EUR", "eur": "EUR"
        }
        
        self.multiplier_map = {
            "cr": 1e7, "crore": 1e7, "crores": 1e7,
            "lakh": 1e5, "lakhs": 1e5,
            "m": 1e6, "million": 1e6, "millions": 1e6,
            "b": 1e9, "billion": 1e9, "billions": 1e9,
            "k": 1e3, "thousand": 1e3, "thousands": 1e3
        }

    def _parse_numeric(self, val_str: Optional[str]) -> Tuple[Optional[float], Optional[str]]:
        """
        Parses a numeric string like '(₹500 Cr)' into (-5000000000.0, 'INR').
        Returns (value, currency_code).
        """
        if not val_str:
            return None, None
            
        original_str = val_str.strip()
        working_str = original_str
        
        # 1. Detect negative values (parentheses or minus sign)
        is_negative = False
        if working_str.startswith("(") and working_str.endswith(")"):
            is_negative = True
            working_str = working_str[1:-1].strip()
        elif working_str.startswith("-"):
            is_negative = True
            working_str = working_str[1:].strip()
            
        # 2. Extract numeric core
        num_match = re.search(r'(?:\d+(?:,\d+)*(?:\.\d+)?|\.\d+)', working_str)
        if not num_match:
            return None, None
            
        num_str = num_match.group(0).replace(",", "")
        try:
            val = float(num_str)
        except ValueError:
            return None, None
            
        # 3. Analyze the rest of the string for currency and multipliers
        # Remove the numeric part to safely search for words
        rest_of_string = working_str.replace(num_match.group(0), "").lower()
        
        currency = None
        for symbol, code in self.currency_map.items():
            if symbol in original_str.lower():
                currency = code
                break
                
        multiplier = 1.0
        for word, mult in self.multiplier_map.items():
            # Match whole words to avoid 'm' in 'company'
            if re.search(rf'\b{word}\b', rest_of_string):
                multiplier = mult
                break
                
        final_val = val * multiplier
        if is_negative:
            final_val = -final_val
            
        return final_val, currency

    def _normalize_fiscal_year(self, fy_str: Optional[str]) -> Optional[str]:
        if not fy_str:
            return None
            
        fy_str = fy_str.strip().upper()
        
        # e.g., FY2024-25 or 2024-25 -> 2024-25
        m = re.search(r'(?:FY)?(\d{4})-(\d{2,4})', fy_str)
        if m:
            y1, y2 = m.groups()
            if len(y2) == 4:
                y2 = y2[-2:]
            return f"{y1}-{y2}"
            
        # e.g., FY24 -> 2023-24
        m = re.search(r'FY(\d{2})$', fy_str)
        if m:
            y2 = int(m.group(1))
            y1 = y2 - 1
            return f"20{y1}-{y2}"
            
        # e.g., March 2024 -> 2023-24
        m = re.search(r'MARCH\s+(\d{4})', fy_str)
        if m:
            y2 = int(m.group(1))
            y1 = y2 - 1
            return f"{y1}-{str(y2)[-2:]}"
            
        return fy_str

    async def normalize(self, raw_data: RawFinancialData) -> FinancialData:
        """
        Normalizes raw financial strings into strict floats.
        """
        logger.info("Starting normalization")
        
        # Parse fields
        rev, curr_rev = self._parse_numeric(raw_data.revenue)
        np, curr_np = self._parse_numeric(raw_data.net_profit)
        ebitda, curr_ebitda = self._parse_numeric(raw_data.ebitda)
        assets, curr_assets = self._parse_numeric(raw_data.total_assets)
        liabs, curr_liabs = self._parse_numeric(raw_data.total_liabilities)
        
        # Determine primary currency
        # If the raw_data.currency is present, normalize it
        primary_curr = None
        if raw_data.currency:
            lower_curr = raw_data.currency.lower()
            for symbol, code in self.currency_map.items():
                if symbol in lower_curr:
                    primary_curr = code
                    break
        
        # Fallback to currency found in metrics
        if not primary_curr:
            for c in [curr_rev, curr_np, curr_ebitda, curr_assets, curr_liabs]:
                if c:
                    primary_curr = c
                    break
                    
        norm_fy = self._normalize_fiscal_year(raw_data.fiscal_year)
        
        # Calculate new normalization confidence based on successful parsing
        # Count how many non-null raw fields were successfully parsed
        raw_numeric_fields = [raw_data.revenue, raw_data.net_profit, raw_data.ebitda, raw_data.total_assets, raw_data.total_liabilities]
        parsed_fields = [rev, np, ebitda, assets, liabs]
        
        attempts = sum(1 for f in raw_numeric_fields if f is not None)
        successes = sum(1 for f in parsed_fields if f is not None)
        
        # We don't overwrite confidence_score completely, but we could log parsing success
        if attempts > 0 and successes < attempts:
            logger.warning("Some numeric fields could not be parsed", attempts=attempts, successes=successes)
            
        result = FinancialData(
            company_name=raw_data.company_name.strip() if raw_data.company_name else None,
            fiscal_year=norm_fy,
            revenue=rev,
            net_profit=np,
            ebitda=ebitda,
            total_assets=assets,
            total_liabilities=liabs,
            currency=primary_curr,
            confidence_score=raw_data.confidence_score,
            field_confidences=raw_data.field_confidences
        )
        
        logger.info("Normalization complete", company=result.company_name, fiscal_year=result.fiscal_year)
        return result
