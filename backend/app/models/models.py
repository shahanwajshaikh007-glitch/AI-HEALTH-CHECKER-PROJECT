"""
SQLAlchemy ORM Models
Defines all tables required by the AI Medical Symptom Assistant.
"""

from datetime import datetime, timezone
import uuid
from sqlalchemy import (
    Column, String, Integer, Float, Text, Boolean, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from app.db.session import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    full_name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="user", nullable=False)  # user | admin
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    phone = Column(String(20), nullable=True)
    language = Column(String(10), default="en")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    assessments = relationship("Assessment", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")


class Symptom(Base):
    __tablename__ = "symptoms"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    normalized_name = Column(String(100), nullable=False, index=True)
    category = Column(String(50), nullable=False, default="General")  # General, Respiratory, Digestive, etc.
    description = Column(Text, nullable=True)

    synonyms = relationship("SymptomSynonym", back_populates="symptom", cascade="all, delete-orphan")


class SymptomSynonym(Base):
    __tablename__ = "symptom_synonyms"

    id = Column(Integer, primary_key=True, autoincrement=True)
    symptom_id = Column(Integer, ForeignKey("symptoms.id", ondelete="CASCADE"), nullable=False)
    synonym = Column(String(100), nullable=False, index=True)
    language = Column(String(10), default="en")

    symptom = relationship("Symptom", back_populates="synonyms")


class Disease(Base):
    __tablename__ = "diseases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(120), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    general_information = Column(Text, nullable=True)
    warning_signs = Column(Text, nullable=True)


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    raw_symptoms_text = Column(Text, nullable=True)
    extracted_symptoms = Column(Text, nullable=False)  # JSON string array
    duration = Column(String(50), nullable=True)
    severity = Column(String(20), nullable=True)  # Mild, Moderate, Severe
    existing_conditions = Column(Text, nullable=True)
    current_medications = Column(Text, nullable=True)
    is_emergency = Column(Boolean, default=False)
    emergency_warnings = Column(Text, nullable=True)  # JSON string array
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="assessments")
    predictions = relationship("Prediction", back_populates="assessment", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="assessment", cascade="all, delete-orphan")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    assessment_id = Column(String(36), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    disease_name = Column(String(120), nullable=False)
    probability = Column(Float, nullable=False)
    rank = Column(Integer, nullable=False)  # 1, 2, 3

    assessment = relationship("Assessment", back_populates="predictions")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), default="Health Consultation")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender = Column(String(10), nullable=False)  # user | ai
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    conversation = relationship("Conversation", back_populates="messages")


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    assessment_id = Column(String(36), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="reports")
    assessment = relationship("Assessment", back_populates="reports")


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String(100), nullable=False)
    version = Column(String(20), nullable=False)
    accuracy = Column(Float, nullable=False)
    precision_score = Column(Float, nullable=False)
    recall = Column(Float, nullable=False)
    f1_score = Column(Float, nullable=False)
    dataset_size = Column(Integer, nullable=False)
    trained_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
