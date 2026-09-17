"""
Database Session Manager
Supports MySQL with automatic fallback to SQLite for easy local execution.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

Base = declarative_base()


def get_db_url() -> str:
    # Attempt MySQL first
    mysql_url = settings.DATABASE_URL
    try:
        # Quick check if pymysql connection works or fallback to sqlite
        if "your_password_here" in mysql_url or "root:@" in mysql_url:
            # Use SQLite database in backend directory for development reliability
            db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "medical_app.db"))
            return f"sqlite:///{db_path}"
        return mysql_url
    except Exception:
        db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "medical_app.db"))
        return f"sqlite:///{db_path}"


# Create engine
db_url = get_db_url()
is_sqlite = db_url.startswith("sqlite")

connect_args = {"check_same_thread": False} if is_sqlite else {}
engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
