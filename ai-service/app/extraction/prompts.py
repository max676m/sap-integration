"""
Prompt templates for NLP structured extraction.
Parameterized — automatically adapts when new fields are added to the registry.
No hardcoded field names.
"""

from typing import List, Dict


def build_extraction_prompt(
    user_text: str,
    field_definitions: List[Dict],
) -> str:
    """
    Builds a structured extraction prompt from field definitions.
    The LLM is asked to extract each field from the user's text.
    """

    # Build the field list section dynamically
    field_lines = []
    for fd in field_definitions:
        required_tag = "REQUIRED" if fd.get("required", False) else "optional"
        example = fd.get("example", "N/A")
        field_lines.append(
            f'  - "{fd["key"]}" ({fd["label"]}) [{required_tag}] — example: "{example}"'
        )

    fields_section = "\n".join(field_lines)

    return f"""You are a structured data extraction assistant for a beverage manufacturing company (MenaBev).

Your task is to extract specific product fields from the user's natural language description.

## Fields to Extract

{fields_section}

## User's Description

"{user_text}"

## Instructions

1. Read the user's description carefully.
2. Extract values for each field listed above.
3. If a field's value is clearly stated or can be inferred, include it.
4. If a field's value is NOT mentioned or cannot be inferred, set it to null.
5. Provide a confidence score (0.0 to 1.0) reflecting how confident you are in the overall extraction.

## Output Format

Respond with ONLY a valid JSON object in this exact format (no markdown, no explanation):

{{
  "fields": {{
    "fieldKey1": "extracted value or null",
    "fieldKey2": "extracted value or null"
  }},
  "confidence": 0.85
}}
"""
