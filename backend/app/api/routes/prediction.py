"""
Prediction Router — Disease prediction & Assessment history using MongoDB.
"""

from datetime import datetime, timezone
from typing import List, Optional, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from bson import ObjectId

from app.database.mongodb import get_mongodb
from app.auth.deps import get_current_user
from app.nlp.extractor import extract_symptoms_and_emergencies
from app.ml.predictor import predict_disease

router = APIRouter()


class PredictionRequest(BaseModel):
    symptoms: List[str]
    raw_text: Optional[str] = None
    duration: Optional[str] = "1-3 days"
    severity: Optional[str] = "Moderate"
    input_method: Optional[str] = "text"  # voice | text | manual
    existing_conditions: Optional[str] = None
    current_medications: Optional[str] = None


@router.post("", summary="Perform Disease Prediction")
async def run_prediction(
    body: PredictionRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_mongodb)
):
    if not body.symptoms and not body.raw_text:
        raise HTTPException(
            status_code=400,
            detail="Either selected symptoms or text description is required."
        )

    all_symptoms = list(body.symptoms or [])
    is_emergency = False
    emergency_warnings = []

    # Check NLP if raw_text is provided
    if body.raw_text:
        extracted, text_emergency, text_warnings = extract_symptoms_and_emergencies(body.raw_text)
        for s in extracted:
            if s not in all_symptoms:
                all_symptoms.append(s)
        if text_emergency:
            is_emergency = True
            emergency_warnings.extend(text_warnings)

    # Also check extracted list for emergency triggers
    for sym in all_symptoms:
        if sym.lower() in ["chest pain", "shortness of breath"]:
            is_emergency = True
            if f"Urgent attention advised for {sym}." not in emergency_warnings:
                emergency_warnings.append(f"Urgent attention advised for {sym}.")

    # Predict ML result
    prediction_result = predict_disease(
        symptoms=all_symptoms,
        duration=body.duration or "1-3 days",
        severity=body.severity or "Moderate",
        age=current_user.get("age"),
        gender=current_user.get("gender")
    )

    user_id = str(current_user["id"])
    now_iso = datetime.now(timezone.utc).isoformat()

    # Save assessment document to MongoDB
    assessment_doc = {
        "user_id": user_id,
        "raw_symptoms_text": body.raw_text or ", ".join(all_symptoms),
        "symptoms": all_symptoms,
        "duration": body.duration,
        "severity": body.severity,
        "input_method": body.input_method or ("voice" if "voice" in str(body.raw_text).lower() else "text"),
        "existing_conditions": body.existing_conditions,
        "current_medications": body.current_medications,
        "is_emergency": is_emergency,
        "emergency_warnings": emergency_warnings,
        "created_at": now_iso,
    }
    ass_res = db.assessments.insert_one(assessment_doc)
    assessment_id = str(ass_res.inserted_id)

    # Save prediction document to MongoDB
    prediction_doc = {
        "assessment_id": assessment_id,
        "user_id": user_id,
        "top_prediction": prediction_result.get("top_prediction"),
        "confidence": prediction_result.get("confidence"),
        "description": prediction_result.get("description"),
        "advice": prediction_result.get("advice"),
        "top_3_conditions": [
            {
                "disease": item["disease"],
                "probability": float(item["probability"]),
                "rank": idx + 1
            }
            for idx, item in enumerate(prediction_result.get("top_3_conditions", []))
        ],
        "created_at": now_iso,
    }
    db.predictions.insert_one(prediction_doc)

    return {
        "assessment_id": assessment_id,
        "created_at": now_iso,
        "symptoms": all_symptoms,
        "is_emergency": is_emergency,
        "emergency_warnings": emergency_warnings,
        "top_prediction": prediction_result.get("top_prediction"),
        "confidence": prediction_result.get("confidence"),
        "description": prediction_result.get("description"),
        "advice": prediction_result.get("advice"),
        "top_3_conditions": prediction_result.get("top_3_conditions", []),
    }


@router.get("/history", summary="Get User Assessment History")
async def get_history(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_mongodb)
):
    user_id = str(current_user["id"])
    assessments = list(db.assessments.find({"user_id": user_id}).sort("created_at", -1))

    results = []
    for a in assessments:
        ass_id = str(a["_id"])
        pred = db.predictions.find_one({"assessment_id": ass_id, "user_id": user_id})

        top_pred = pred.get("top_prediction", "General Assessment") if pred else "General Assessment"
        confidence = pred.get("confidence", 0.0) if pred else 0.0
        top_3 = pred.get("top_3_conditions", []) if pred else []

        results.append({
            "id": ass_id,
            "created_at": a.get("created_at"),
            "raw_text": a.get("raw_symptoms_text"),
            "symptoms": a.get("symptoms", []),
            "duration": a.get("duration"),
            "severity": a.get("severity"),
            "input_method": a.get("input_method", "text"),
            "is_emergency": a.get("is_emergency", False),
            "emergency_warnings": a.get("emergency_warnings", []),
            "top_prediction": top_pred,
            "confidence": confidence,
            "top_3_conditions": top_3,
        })

    return {"assessments": results}


@router.get("/{assessment_id}", summary="Get assessment details by ID")
async def get_assessment_by_id(
    assessment_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_mongodb)
):
    user_id = str(current_user["id"])
    query = {"_id": ObjectId(assessment_id)} if ObjectId.is_valid(assessment_id) else {"_id": assessment_id}
    assessment = db.assessments.find_one(query)

    if not assessment or assessment.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Assessment not found.")

    pred = db.predictions.find_one({"assessment_id": str(assessment["_id"])})
    pred_data = None
    if pred:
        pred_data = {
            "id": str(pred["_id"]),
            "assessment_id": pred.get("assessment_id"),
            "user_id": pred.get("user_id"),
            "top_prediction": pred.get("top_prediction"),
            "confidence": pred.get("confidence"),
            "description": pred.get("description"),
            "advice": pred.get("advice"),
            "top_3_conditions": pred.get("top_3_conditions", []),
            "created_at": pred.get("created_at")
        }

    return {
        "assessment": {
            "id": str(assessment["_id"]),
            "symptoms": assessment.get("symptoms", []),
            "duration": assessment.get("duration"),
            "severity": assessment.get("severity"),
            "created_at": assessment.get("created_at"),
            "is_emergency": assessment.get("is_emergency", False),
            "emergency_warnings": assessment.get("emergency_warnings", []),
        },
        "prediction": pred_data
    }


@router.delete("/history/{assessment_id}", summary="Delete an assessment record")
@router.delete("/{assessment_id}", summary="Delete an assessment record")
async def delete_assessment(
    assessment_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_mongodb)
):
    user_id = str(current_user["id"])
    query = {"user_id": user_id}
    if ObjectId.is_valid(assessment_id):
        query["_id"] = ObjectId(assessment_id)
    else:
        query["_id"] = assessment_id

    assessment = db.assessments.find_one(query)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found.")

    ass_id_str = str(assessment["_id"])
    db.assessments.delete_one({"_id": assessment["_id"]})
    db.predictions.delete_many({"assessment_id": ass_id_str})
    db.reports.delete_many({"assessment_id": ass_id_str})

    return {"message": "Assessment deleted successfully."}
