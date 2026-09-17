"""
Health check router — MongoDB connection status endpoint.
"""

import platform
import sys
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.database.mongodb import mongo_manager

router = APIRouter()


@router.get("/health", summary="Health Check")
async def health_check():
    """
    Returns the current status of the API and database connectivity.
    """
    db_connected = mongo_manager.is_connected()
    db_type = "MongoDB (mock/local)" if mongo_manager._is_mock else "MongoDB"

    return JSONResponse({
        "status": "healthy" if db_connected else "degraded",
        "service": "AI Medical Symptom Assistant API",
        "version": "1.0.0",
        "database": "connected" if db_connected else "disconnected",
        "database_type": db_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "python_version": sys.version.split()[0],
        "platform": platform.system(),
    })


@router.get("/ping", summary="Ping")
async def ping():
    """Simple ping endpoint."""
    return {"ping": "pong", "timestamp": datetime.now(timezone.utc).isoformat()}
