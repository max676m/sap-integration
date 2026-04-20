"""
Core extraction logic.
Builds a structured extraction prompt, calls Gemini, and parses the response
into structured fields + confidence + missing list.
"""

import json
import re
from typing import Any, Dict, List

import google.generativeai as genai

from app.config import GEMINI_API_KEY, GEMINI_MODEL, TEMPERATURE, MAX_TOKENS
from app.extraction.prompts import build_extraction_prompt

# Configure the Gemini client
genai.configure(api_key=GEMINI_API_KEY)


async def extract_fields(
    text: str,
    product_type: str,
    field_definitions: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Extracts structured product fields from user text using Gemini.

    Args:
        text: Raw natural-language text from the user.
        product_type: The product type (NEW_PRODUCT, EXTENSION).
        field_definitions: List of field definitions from the backend registry.

    Returns:
        dict with keys: fields, confidence, missing_fields
    """

    # Build the prompt
    prompt = build_extraction_prompt(text, field_definitions)

    # Call Gemini
    model = genai.GenerativeModel(
        GEMINI_MODEL,
        generation_config=genai.GenerationConfig(
            temperature=TEMPERATURE,
            max_output_tokens=MAX_TOKENS,
        ),
    )

    response = model.generate_content(prompt)

    # Parse the LLM response
    parsed = parse_llm_response(response.text, field_definitions)

    return parsed


def parse_llm_response(
    raw_text: str,
    field_definitions: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Parses the LLM's JSON response into structured output.
    Handles cases where the LLM wraps JSON in markdown code blocks.
    """

    # Strip markdown code fences if present
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    cleaned = cleaned.strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        # If parsing fails, return empty extraction
        all_keys = [fd["key"] for fd in field_definitions]
        return {
            "fields": {},
            "confidence": 0.0,
            "missing_fields": all_keys,
        }

    extracted_fields = data.get("fields", {})
    confidence = float(data.get("confidence", 0.0))

    # Determine which fields are missing (null, empty, or absent)
    all_keys = [fd["key"] for fd in field_definitions]
    missing_fields = [
        key
        for key in all_keys
        if extracted_fields.get(key) is None or extracted_fields.get(key) == ""
    ]

    # Clean out null values from extracted fields
    clean_fields = {
        k: v for k, v in extracted_fields.items() if v is not None and v != ""
    }

    return {
        "fields": clean_fields,
        "confidence": confidence,
        "missing_fields": missing_fields,
    }
