import os
import pytest

requires_api = pytest.mark.skipif(
    os.getenv("RUN_INTEGRATION_TESTS", "false").lower() != "true",
    reason="Integration tests require RUN_INTEGRATION_TESTS=true and valid API keys"
)
