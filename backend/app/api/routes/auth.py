"""
Auth router — Register & Login endpoints using MongoDB.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, field_validator
from passlib.context import CryptContext
from jose import jwt
from bson import ObjectId

from app.config import settings
from app.database.mongodb import get_mongodb

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Schemas ───────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    confirm_password: str
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    language: str = "en"

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Full name cannot be empty")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ── Helpers ───────────────────────────────────────────────────────

def _create_token(user_id: str, email: str, role: str = "user") -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc)
            + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def user_to_dict(user: dict) -> dict:
    return {
        "id": str(user.get("_id", user.get("id"))),
        "full_name": user.get("full_name", user.get("name", "")),
        "email": user.get("email", ""),
        "role": user.get("role", "user"),
        "age": user.get("age"),
        "gender": user.get("gender"),
        "phone": user.get("phone"),
        "language": user.get("language", "en"),
        "created_at": user.get("created_at"),
        "updated_at": user.get("updated_at"),
    }


# ── Routes ────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def register(body: RegisterRequest, db = Depends(get_mongodb)):
    email = body.email.lower()

    existing_user = db.users.find_one({"email": email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    hashed = pwd_context.hash(body.password)
    now_iso = datetime.now(timezone.utc).isoformat()

    user_doc = {
        "full_name": body.full_name,
        "name": body.full_name,
        "email": email,
        "password_hash": hashed,
        "role": "user",
        "age": body.age,
        "gender": body.gender,
        "phone": body.phone,
        "language": body.language,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    result = db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    token = _create_token(str(result.inserted_id), email, "user")
    return AuthResponse(
        access_token=token,
        user=user_to_dict(user_doc),
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Login with email and password",
)
async def login(body: LoginRequest, db = Depends(get_mongodb)):
    email = body.email.lower()
    user = db.users.find_one({"email": email})

    if not user or not pwd_context.verify(body.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    token = _create_token(str(user["_id"]), email, user.get("role", "user"))
    return AuthResponse(
        access_token=token,
        user=user_to_dict(user),
    )
