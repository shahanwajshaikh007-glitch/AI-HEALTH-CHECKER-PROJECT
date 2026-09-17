"""
AI Medical Symptom Assistant — FastAPI Application
Entrypoint: app/main.py
MongoDB edition — SQLite/SQLAlchemy replaced by PyMongo.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database.mongodb import mongo_manager
from app.api.routes import (
    health, auth, profile, symptoms, prediction, chat, reports, admin
)

# ─────────────────────────────────────────────────
# App Factory
# ─────────────────────────────────────────────────

def create_app() -> FastAPI:
    # Initialize MongoDB connection, indexes and seed data
    mongo_manager.connect()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "AI-powered symptom analysis and disease prediction platform. "
            "For educational and informational purposes only."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # ── CORS Configuration for Frontend ↔ Backend Connection ──────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8080",
            "http://127.0.0.1:8080",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
        ],
        allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ───────────────────────────────────
    app.include_router(health.router, prefix="/api", tags=["Health"])
    app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
    app.include_router(profile.router, prefix="/api/profile", tags=["Profile"])
    app.include_router(symptoms.router, prefix="/api/symptoms", tags=["Symptoms"])
    app.include_router(prediction.router, prefix="/api/prediction", tags=["Prediction"])
    app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
    app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
    app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

    # ── Root endpoint ─────────────────────────────
    @app.get("/", include_in_schema=False)
    async def root():
        return JSONResponse({
            "message": f"Welcome to {settings.APP_NAME}",
            "version": settings.APP_VERSION,
            "docs": "/docs",
            "status": "running",
            "database": "MongoDB"
        })

    return app


app = create_app()
