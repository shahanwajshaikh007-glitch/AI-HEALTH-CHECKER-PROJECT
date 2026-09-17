"""
Symptoms Router — Analyze symptoms text / voice transcript & fetch symptom database using MongoDB.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional

from app.database.mongodb import get_mongodb
from app.nlp.extractor import extract_symptoms_and_emergencies

router = APIRouter()


class SymptomAnalyzeRequest(BaseModel):
    text: str
    language: Optional[str] = "en"


@router.post("/analyze", summary="Analyze natural language / voice symptoms text")
async def analyze_symptoms(body: SymptomAnalyzeRequest, db = Depends(get_mongodb)):
    if not body.text or not body.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide symptoms text to analyze."
        )

    detected_symptoms, is_emergency, emergency_warnings = extract_symptoms_and_emergencies(body.text)

    return {
        "raw_text": body.text,
        "extracted_symptoms": detected_symptoms,
        "is_emergency": is_emergency,
        "emergency_warnings": emergency_warnings,
        "count": len(detected_symptoms)
    }


@router.get("", summary="Get list of available symptoms")
async def get_symptoms(db = Depends(get_mongodb)):
    symptoms = list(db.symptoms.find({}, {"_id": 1, "name": 1, "normalized_name": 1, "category": 1, "description": 1}))
    result = []
    for s in symptoms:
        result.append({
            "id": str(s["_id"]),
            "name": s.get("name"),
            "normalized_name": s.get("normalized_name"),
            "category": s.get("category", "General"),
            "description": s.get("description", "")
        })
    return {"symptoms": result}
