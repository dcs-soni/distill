import os
import pytest
from app.prompts.loader import PromptLoader

def test_prompt_loader_loads_versioned_prompt():
    loader = PromptLoader()
    # Assuming extract_annual_report_v1.txt exists
    content = loader.load("extract_annual_report", "v1")
    assert "description: Extraction prompt" in content
    assert "version: v1" in content

def test_prompt_loader_fallback():
    loader = PromptLoader()
    # "classify.txt" exists, "classify_v99.txt" does not
    content = loader.load("classify", "v99")
    assert "doc_type" in content
    assert "version: v1" in content or "ROLE:" in content # Either it loads fallback classify.txt or classify_v1 if we renamed it. Wait, classify.txt is unversioned.

def test_prompt_loader_not_found():
    loader = PromptLoader()
    with pytest.raises(FileNotFoundError):
        loader.load("non_existent_prompt", "v1")
