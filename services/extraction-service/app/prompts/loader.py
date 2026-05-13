import os
import structlog
from typing import Optional

logger = structlog.get_logger("extraction-service")

class PromptLoader:
    """Loads versioned prompt templates from the file system."""
    
    def __init__(self, base_dir: Optional[str] = None):
        if base_dir is None:
            self.base_dir = os.path.dirname(os.path.abspath(__file__))
        else:
            self.base_dir = base_dir

    def load(self, prompt_name: str, version: str = "v1") -> str:
        """
        Load a prompt template by name and version.
        Falls back to unversioned if the versioned file is not found.
        """
        filename = f"{prompt_name}_{version}.txt"
        filepath = os.path.join(self.base_dir, filename)
        
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            logger.warning(f"Versioned prompt {filename} not found, checking fallback", filepath=filepath)
            fallback_path = os.path.join(self.base_dir, f"{prompt_name}.txt")
            if os.path.exists(fallback_path):
                logger.info(f"Using fallback unversioned prompt {prompt_name}.txt")
                with open(fallback_path, "r", encoding="utf-8") as f:
                    return f.read()
            
            logger.error(f"Prompt template {prompt_name} not found in {self.base_dir}")
            raise FileNotFoundError(f"Prompt template {filename} or fallback not found in {self.base_dir}")
