"""
FastAPI app for the MenaBev AI Service.

Endpoints:
  POST /extract — NLP structured extraction from user text
  GET  /health  — Health check
"""

from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.extraction.extractor import extract_fields

# ============================
# FastAPI App
# ============================

app = FastAPI(
    title="MenaBev AI Service",
    description="NLP structured extraction for the MenaBev NPL application.",
    version="0.1.0",
)

# CORS — allow all for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================
# Request / Response Models
# ============================


class FieldDefinition(BaseModel):
    key: str
    label: str
    required: bool
    example: str


class ExtractRequest(BaseModel):
    text: str
    product_type: str
    field_definitions: List[FieldDefinition]


class ExtractResponse(BaseModel):
    fields: Dict[str, Any]
    confidence: float
    missing_fields: List[str]


# ============================
# Endpoints
# ============================


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "ai-service"}


@app.post("/extract", response_model=ExtractResponse)
async def extract(request: ExtractRequest):
    """
    Extracts structured product fields from user text using Gemini LLM.
    """
    try:
        result = await extract_fields(
            text=request.text,
            product_type=request.product_type,
            field_definitions=[fd.model_dump() for fd in request.field_definitions],
        )
        return ExtractResponse(**result)
    except Exception as e:
        print(f"[ai-service] Extraction error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Extraction failed: {str(e)}",
        )
