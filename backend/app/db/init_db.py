"""
Database Initialization & Seeding Script
Populates initial symptoms, multilingual synonyms, disease records, and default admin user.
Does NOT create any hardcoded demo users.
"""

from passlib.context import CryptContext
from app.db.session import engine, Base, SessionLocal
from app.models.models import (
    User, Symptom, SymptomSynonym, Disease, ModelVersion
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# Initial Symptoms with Categories
INITIAL_SYMPTOMS = [
    # General
    {"name": "Fever", "normalized": "fever", "category": "General", "description": "Elevated body temperature above 98.6°F (37°C)."},
    {"name": "Fatigue", "normalized": "fatigue", "category": "General", "description": "Feeling constantly weak, tired, or lacking energy."},
    {"name": "Chills", "normalized": "chills", "category": "General", "description": "Feelings of coldness accompanied by shivering."},
    {"name": "Body Pain", "normalized": "body_pain", "category": "General", "description": "Generalized muscle and body aches."},
    {"name": "Loss of Appetite", "normalized": "loss_of_appetite", "category": "General", "description": "Reduced desire to eat."},

    # Respiratory
    {"name": "Cough", "normalized": "cough", "category": "Respiratory", "description": "Sudden expulsion of air from the lungs."},
    {"name": "Dry Cough", "normalized": "dry_cough", "category": "Respiratory", "description": "Tickling cough that does not produce mucus."},
    {"name": "Sore Throat", "normalized": "sore_throat", "category": "Respiratory", "description": "Pain, scratchiness or irritation of the throat."},
    {"name": "Runny Nose", "normalized": "runny_nose", "category": "Respiratory", "description": "Excess mucus discharging from the nasal passages."},
    {"name": "Sneezing", "normalized": "sneezing", "category": "Respiratory", "description": "Involuntary, sudden discharge of air from nose and mouth."},
    {"name": "Shortness of Breath", "normalized": "shortness_of_breath", "category": "Respiratory", "description": "Difficulty or discomfort in breathing."},
    {"name": "Chest Pain", "normalized": "chest_pain", "category": "Respiratory", "description": "Discomfort or pain felt anywhere along the front of the chest."},

    # Digestive
    {"name": "Nausea", "normalized": "nausea", "category": "Digestive", "description": "Urge or feeling like vomiting."},
    {"name": "Vomiting", "normalized": "vomiting", "category": "Digestive", "description": "Involuntary throwing up of stomach contents."},
    {"name": "Diarrhea", "normalized": "diarrhea", "category": "Digestive", "description": "Frequent, loose, or watery bowel movements."},
    {"name": "Abdominal Pain", "normalized": "abdominal_pain", "category": "Digestive", "description": "Cramping or pain in the stomach/abdomen area."},

    # Neurological
    {"name": "Headache", "normalized": "headache", "category": "Neurological", "description": "Pain in any region of the head."},
    {"name": "Dizziness", "normalized": "dizziness", "category": "Neurological", "description": "Lightheadedness, feeling faint or unsteady."},

    # Musculoskeletal
    {"name": "Joint Pain", "normalized": "joint_pain", "category": "Musculoskeletal", "description": "Discomfort or inflammation in one or more joints."},
    {"name": "Back Pain", "normalized": "back_pain", "category": "Musculoskeletal", "description": "Ache or pain in the spinal region or lower back."},
]


# Multilingual Synonym Mapping (English, Hindi, Marathi)
INITIAL_SYNONYMS = [
    # Fever
    ("Fever", "high temperature", "en"),
    ("Fever", "feverish", "en"),
    ("Fever", "बुखार", "hi"),
    ("Fever", "ताप", "mr"),

    # Headache
    ("Headache", "pain in head", "en"),
    ("Headache", "head throbbing", "en"),
    ("Headache", "सिर दर्द", "hi"),
    ("Headache", "सरदर्द", "hi"),
    ("Headache", "डोकेदुखी", "mr"),

    # Cough & Dry Cough
    ("Cough", "coughing", "en"),
    ("Cough", "खांसी", "hi"),
    ("Cough", "खोकला", "mr"),
    ("Dry Cough", "dry coughing", "en"),
    ("Dry Cough", "सूखी खांसी", "hi"),
    ("Dry Cough", "कोरडा खोकला", "mr"),

    # Fatigue
    ("Fatigue", "tiredness", "en"),
    ("Fatigue", "feeling weak", "en"),
    ("Fatigue", "थकान", "hi"),
    ("Fatigue", "सुस्ती", "hi"),
    ("Fatigue", "थकवा", "mr"),

    # Body Pain
    ("Body Pain", "body ache", "en"),
    ("Body Pain", "muscle pain", "en"),
    ("Body Pain", "बदन दर्द", "hi"),
    ("Body Pain", "अंगदुखी", "mr"),

    # Sore Throat
    ("Sore Throat", "throat pain", "en"),
    ("Sore Throat", "throat irritation", "en"),
    ("Sore Throat", "गले में खराश", "hi"),
    ("Sore Throat", "घसा दुखणे", "mr"),

    # Shortness of breath
    ("Shortness of Breath", "can't breathe", "en"),
    ("Shortness of Breath", "breathing issue", "en"),
    ("Shortness of Breath", "सांस लेने में तकलीफ", "hi"),
    ("Shortness of Breath", "दम लागणे", "mr"),

    # Chest Pain
    ("Chest Pain", "chest pressure", "en"),
    ("Chest Pain", "छाती में दर्द", "hi"),
    ("Chest Pain", "छातीत दुखणे", "mr"),
]


# Educational Disease Descriptions
INITIAL_DISEASES = [
    {
        "name": "Common Cold",
        "description": "A viral infection of your nose and throat (upper respiratory tract). Usually harmless.",
        "general_information": "Rest, hydration, and over-the-counter remedies generally resolve symptoms within 7 to 10 days.",
        "warning_signs": "High persistent fever above 102°F, shortness of breath, or symptoms lasting longer than 10 days."
    },
    {
        "name": "Influenza (Flu)",
        "description": "A contagious respiratory illness caused by influenza viruses that infect the nose, throat, and lungs.",
        "general_information": "Flu comes on suddenly with high fever, body aches, chills, and fatigue. Adequate rest and fluid intake are essential.",
        "warning_signs": "Difficulty breathing, persistent chest pressure, sudden dizziness, or severe vomiting."
    },
    {
        "name": "COVID-19 (Viral Infection)",
        "description": "A respiratory illness caused by the SARS-CoV-2 virus, ranging from mild cold-like symptoms to pneumonia.",
        "general_information": "Common symptoms include fever, dry cough, fatigue, and sore throat. Self-isolation and testing are recommended.",
        "warning_signs": "Trouble breathing, persistent pain or pressure in the chest, new confusion, or pale/blue skin tone."
    },
    {
        "name": "Gastroenteritis (Stomach Flu)",
        "description": "An intestinal infection marked by watery diarrhea, abdominal cramps, nausea, vomiting, and fever.",
        "general_information": "Focus on oral rehydration solution (ORS) and fluids to prevent dehydration.",
        "warning_signs": "Inability to keep liquids down for 24 hours, signs of severe dehydration, blood in vomit or stool."
    },
    {
        "name": "Migraine",
        "description": "A neurological condition causing intense throbbing headache, often accompanied by nausea and light sensitivity.",
        "general_information": "Rest in a quiet, dark room. Hydration and stress management help prevent trigger episodes.",
        "warning_signs": "Sudden severe headache like a thunderclap, headache with fever and stiff neck, or numbness/speech difficulty."
    },
    {
        "name": "Bronchitis",
        "description": "Inflammation of the lining of your bronchial tubes, which carry air to and from your lungs.",
        "general_information": "Characterized by persistent cough producing mucus, fatigue, and chest discomfort.",
        "warning_signs": "Coughing up blood, wheezing, fever over 101°F, or shortness of breath at rest."
    },
    {
        "name": "Allergic Rhinitis (Seasonal Allergies)",
        "description": "An allergic response causing sneezing, itching, runny nose, and watery eyes triggered by environmental allergens.",
        "general_information": "Antihistamines and nasal sprays can relieve symptoms. Avoid known triggers when possible.",
        "warning_signs": "Severe wheezing, hives, or swelling of lips, tongue, or throat."
    }
]


def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Seed Admin User
        admin_email = "admin@aihealth.com"
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        if not existing_admin:
            admin_user = User(
                full_name="System Administrator",
                email=admin_email,
                password_hash=pwd_context.hash("Admin1234!"),
                role="admin",
                age=35,
                gender="other",
                language="en"
            )
            db.add(admin_user)

        # 2. Seed Symptoms
        symptom_map = {}
        for s_data in INITIAL_SYMPTOMS:
            s_obj = db.query(Symptom).filter(Symptom.name == s_data["name"]).first()
            if not s_obj:
                s_obj = Symptom(
                    name=s_data["name"],
                    normalized_name=s_data["normalized"],
                    category=s_data["category"],
                    description=s_data["description"]
                )
                db.add(s_obj)
                db.flush()
            symptom_map[s_data["name"]] = s_obj.id

        # 3. Seed Synonyms
        for s_name, syn_text, lang in INITIAL_SYNONYMS:
            if s_name in symptom_map:
                s_id = symptom_map[s_name]
                existing_syn = db.query(SymptomSynonym).filter(
                    SymptomSynonym.symptom_id == s_id,
                    SymptomSynonym.synonym == syn_text
                ).first()
                if not existing_syn:
                    db.add(SymptomSynonym(
                        symptom_id=s_id,
                        synonym=syn_text,
                        language=lang
                    ))

        # 4. Seed Diseases
        for d_data in INITIAL_DISEASES:
            d_obj = db.query(Disease).filter(Disease.name == d_data["name"]).first()
            if not d_obj:
                db.add(Disease(
                    name=d_data["name"],
                    description=d_data["description"],
                    general_information=d_data["general_information"],
                    warning_signs=d_data["warning_signs"]
                ))

        # 5. Seed Initial Model Version Record
        m_obj = db.query(ModelVersion).first()
        if not m_obj:
            db.add(ModelVersion(
                model_name="Random Forest Classifier",
                version="v1.0.0",
                accuracy=0.925,
                precision_score=0.910,
                recall=0.930,
                f1_score=0.920,
                dataset_size=4920
            ))

        db.commit()
        print("[OK] Database initialized & seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Database initialization failed: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
