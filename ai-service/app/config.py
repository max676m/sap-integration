"""
Configuration for the AI Service.
Reads from environment variables with sensible defaults.
"""

import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY: str = os.getenv("GOOGLE_GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
TEMPERATURE: float = float(os.getenv("TEMPERATURE", "0.1"))
MAX_TOKENS: int = int(os.getenv("MAX_TOKENS", "1024"))
