"""
Profile Router — View and Edit User Profile using MongoDB.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from bson import ObjectId

from app.database.mongodb import get_mongodb
from app.auth.deps import get_current_user
from app.api.routes.auth import user_to_dict

router = APIRouter()


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    language: Optional[str] = None


@router.get("", summary="Get Current User Profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    return user_to_dict(current_user)


@router.put("", summary="Update User Profile")
async def update_profile(
    body: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_mongodb)
):
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}

    if body.full_name is not None:
        if not body.full_name.strip():
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        updates["full_name"] = body.full_name.strip()
        updates["name"] = body.full_name.strip()

    if body.age is not None:
        if body.age < 1 or body.age > 120:
            raise HTTPException(status_code=400, detail="Invalid age")
        updates["age"] = body.age

    if body.gender is not None:
        updates["gender"] = body.gender

    if body.phone is not None:
        updates["phone"] = body.phone

    if body.language is not None:
        updates["language"] = body.language

    user_id = current_user["_id"]
    db.users.update_one({"_id": user_id}, {"$set": updates})

    updated_user = db.users.find_one({"_id": user_id})
    return {
        "message": "Profile updated successfully.",
        "user": user_to_dict(updated_user)
    }
