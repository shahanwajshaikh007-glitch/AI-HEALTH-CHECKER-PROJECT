"""
Auth dependencies for FastAPI.
Decodes JWT tokens and fetches the current authenticated user from MongoDB.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from bson import ObjectId

from app.config import settings
from app.database.mongodb import get_mongodb

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db = Depends(get_mongodb)
) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Try matching ObjectId first, then string ID
    user = None
    if ObjectId.is_valid(user_id):
        user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        user = db.users.find_one({"_id": user_id})

    if user is None:
        raise credentials_exception

    # Normalize user dict
    user_dict = dict(user)
    user_dict["id"] = str(user["_id"])
    return user_dict


def get_current_admin_user(
    current_user: dict = Depends(get_current_user)
) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required."
        )
    return current_user
