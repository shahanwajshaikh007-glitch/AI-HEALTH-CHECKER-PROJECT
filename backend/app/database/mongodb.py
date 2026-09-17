"""
MongoDB Database Manager for AI Health Checker.
Supports PyMongo with MongoDB Atlas and local instances,
index initialization, data seeding, and health checks.
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pymongo import MongoClient, ASCENDING, IndexModel
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from passlib.context import CryptContext
from bson import ObjectId

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Initial Symptoms with Categories
INITIAL_SYMPTOMS = [
    {"name": "Fever", "normalized_name": "fever", "category": "General", "description": "Elevated body temperature above 98.6°F (37°C)."},
    {"name": "Fatigue", "normalized_name": "fatigue", "category": "General", "description": "Feeling constantly weak, tired, or lacking energy."},
    {"name": "Chills", "normalized_name": "chills", "category": "General", "description": "Feelings of coldness accompanied by shivering."},
    {"name": "Body Pain", "normalized_name": "body_pain", "category": "General", "description": "Generalized muscle and body aches."},
    {"name": "Loss of Appetite", "normalized_name": "loss_of_appetite", "category": "General", "description": "Reduced desire to eat."},
    {"name": "Cough", "normalized_name": "cough", "category": "Respiratory", "description": "Sudden expulsion of air from the lungs."},
    {"name": "Dry Cough", "normalized_name": "dry_cough", "category": "Respiratory", "description": "Tickling cough that does not produce mucus."},
    {"name": "Sore Throat", "normalized_name": "sore_throat", "category": "Respiratory", "description": "Pain, scratchiness or irritation of the throat."},
    {"name": "Runny Nose", "normalized_name": "runny_nose", "category": "Respiratory", "description": "Excess mucus discharging from the nasal passages."},
    {"name": "Sneezing", "normalized_name": "sneezing", "category": "Respiratory", "description": "Involuntary, sudden discharge of air from nose and mouth."},
    {"name": "Shortness of Breath", "normalized_name": "shortness_of_breath", "category": "Respiratory", "description": "Difficulty or discomfort in breathing."},
    {"name": "Chest Pain", "normalized_name": "chest_pain", "category": "Respiratory", "description": "Discomfort or pain felt anywhere along the front of the chest."},
    {"name": "Nausea", "normalized_name": "nausea", "category": "Digestive", "description": "Urge or feeling like vomiting."},
    {"name": "Vomiting", "normalized_name": "vomiting", "category": "Digestive", "description": "Involuntary throwing up of stomach contents."},
    {"name": "Diarrhea", "normalized_name": "diarrhea", "category": "Digestive", "description": "Frequent, loose, or watery bowel movements."},
    {"name": "Abdominal Pain", "normalized_name": "abdominal_pain", "category": "Digestive", "description": "Cramping or pain in the stomach/abdomen area."},
    {"name": "Headache", "normalized_name": "headache", "category": "Neurological", "description": "Pain in any region of the head."},
    {"name": "Dizziness", "normalized_name": "dizziness", "category": "Neurological", "description": "Lightheadedness, feeling faint or unsteady."},
    {"name": "Joint Pain", "normalized_name": "joint_pain", "category": "Musculoskeletal", "description": "Discomfort or inflammation in one or more joints."},
    {"name": "Back Pain", "normalized_name": "back_pain", "category": "Musculoskeletal", "description": "Ache or pain in the spinal region or lower back."},
]

INITIAL_DISEASES = [
    {
        "name": "Common Cold",
        "description": "A viral infection of your nose and throat (upper respiratory tract). Usually harmless.",
        "general_information": "Rest, hydration, and over-the-counter remedies generally resolve symptoms within 7 to 10 days.",
        "warning_signs": ["High persistent fever above 102°F", "Shortness of breath", "Symptoms lasting longer than 10 days"]
    },
    {
        "name": "Influenza (Flu)",
        "description": "A contagious respiratory illness caused by influenza viruses that infect the nose, throat, and lungs.",
        "general_information": "Flu comes on suddenly with high fever, body aches, chills, and fatigue. Adequate rest and fluid intake are essential.",
        "warning_signs": ["Difficulty breathing", "Persistent chest pressure", "Sudden dizziness", "Severe vomiting"]
    },
    {
        "name": "COVID-19 (Viral Infection)",
        "description": "A respiratory illness caused by the SARS-CoV-2 virus, ranging from mild cold-like symptoms to pneumonia.",
        "general_information": "Common symptoms include fever, dry cough, fatigue, and sore throat. Self-isolation and testing are recommended.",
        "warning_signs": ["Trouble breathing", "Persistent pain or pressure in the chest", "New confusion", "Pale/blue skin tone"]
    },
    {
        "name": "Gastroenteritis (Stomach Flu)",
        "description": "An intestinal infection marked by watery diarrhea, abdominal cramps, nausea, vomiting, and fever.",
        "general_information": "Focus on oral rehydration solution (ORS) and fluids to prevent dehydration.",
        "warning_signs": ["Inability to keep liquids down for 24 hours", "Signs of severe dehydration", "Blood in vomit or stool"]
    },
    {
        "name": "Migraine",
        "description": "A neurological condition causing intense throbbing headache, often accompanied by nausea and light sensitivity.",
        "general_information": "Rest in a quiet, dark room. Hydration and stress management help prevent trigger episodes.",
        "warning_signs": ["Sudden severe headache like a thunderclap", "Headache with fever and stiff neck", "Numbness or speech difficulty"]
    },
    {
        "name": "Bronchitis",
        "description": "Inflammation of the lining of your bronchial tubes, which carry air to and from your lungs.",
        "general_information": "Characterized by persistent cough producing mucus, fatigue, and chest discomfort.",
        "warning_signs": ["Coughing up blood", "Wheezing", "Fever over 101°F", "Shortness of breath at rest"]
    },
    {
        "name": "Allergic Rhinitis (Seasonal Allergies)",
        "description": "An allergic response causing sneezing, itching, runny nose, and watery eyes triggered by environmental allergens.",
        "general_information": "Antihistamines and nasal sprays can relieve symptoms. Avoid known triggers when possible.",
        "warning_signs": ["Severe wheezing", "Hives", "Swelling of lips, tongue, or throat"]
    }
]


class MongoDBManager:
    def __init__(self):
        self.client: Optional[MongoClient] = None
        self.db = None
        self._is_mock = False

    def connect(self):
        """Initializes connection to MongoDB or falls back to mongomock if unavailable."""
        uri = settings.MONGODB_URI
        db_name = settings.DATABASE_NAME

        try:
            client = MongoClient(
                uri,
                serverSelectionTimeoutMS=2000,
                connectTimeoutMS=2000,
                socketTimeoutMS=2000,
            )
            # Trigger server selection
            client.admin.command('ping')
            self.client = client
            self.db = client[db_name]
            self._is_mock = False
            print(f"[OK] Connected to MongoDB: {db_name} at {uri}")
        except Exception as e:
            print(f"[WARN] Live MongoDB connection failed ({e}). Initializing standalone MongoDB mock engine for development.")
            import mongomock
            self.client = mongomock.MongoClient()
            self.db = self.client[db_name]
            self._is_mock = True

        self.init_indexes()
        self.seed_initial_data()

    def get_database(self):
        if self.db is None:
            self.connect()
        return self.db

    def is_connected(self) -> bool:
        if self.client is None:
            return False
        if self._is_mock:
            return True
        try:
            self.client.admin.command('ping')
            return True
        except Exception:
            return False

    def init_indexes(self):
        """Creates required MongoDB indexes."""
        if self.db is None:
            return

        try:
            # Users: unique index on email
            self.db.users.create_index([("email", ASCENDING)], unique=True)

            # Assessments: index on user_id, created_at
            self.db.assessments.create_index([("user_id", ASCENDING), ("created_at", ASCENDING)])

            # Predictions: index on user_id, assessment_id
            self.db.predictions.create_index([("user_id", ASCENDING), ("assessment_id", ASCENDING)])

            # Conversations: index on user_id
            self.db.conversations.create_index([("user_id", ASCENDING)])

            # Messages: index on conversation_id, user_id
            self.db.messages.create_index([("conversation_id", ASCENDING), ("user_id", ASCENDING)])

            # Reports: index on user_id, assessment_id
            self.db.reports.create_index([("user_id", ASCENDING), ("assessment_id", ASCENDING)])

            print("[OK] MongoDB indexes verified successfully.")
        except Exception as e:
            print(f"[WARN] Index creation warning: {e}")

    def seed_initial_data(self):
        """Seeds symptoms, diseases, default admin, and ML model metrics."""
        if self.db is None:
            return

        try:
            # 1. Admin user
            admin_email = "admin@aihealth.com"
            if not self.db.users.find_one({"email": admin_email}):
                self.db.users.insert_one({
                    "full_name": "System Administrator",
                    "email": admin_email,
                    "password_hash": pwd_context.hash("Admin1234!"),
                    "role": "admin",
                    "age": 35,
                    "gender": "other",
                    "language": "en",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                })

            # 2. Symptoms
            for s in INITIAL_SYMPTOMS:
                if not self.db.symptoms.find_one({"name": s["name"]}):
                    self.db.symptoms.insert_one({
                        **s,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    })

            # 3. Diseases
            for d in INITIAL_DISEASES:
                if not self.db.diseases.find_one({"name": d["name"]}):
                    self.db.diseases.insert_one({
                        **d,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    })

            # 4. Model version record
            if not self.db.model_versions.find_one({"version": "v1.0.0"}):
                self.db.model_versions.insert_one({
                    "model_name": "Random Forest Classifier",
                    "version": "v1.0.0",
                    "accuracy": 0.925,
                    "precision": 0.910,
                    "recall": 0.930,
                    "f1_score": 0.920,
                    "dataset_size": 4920,
                    "trained_at": datetime.now(timezone.utc).isoformat()
                })

            print("[OK] MongoDB initial reference data seeded.")
        except Exception as e:
            print(f"[ERROR] Seeding MongoDB reference data failed: {e}")


mongo_manager = MongoDBManager()


def get_mongodb():
    return mongo_manager.get_database()
