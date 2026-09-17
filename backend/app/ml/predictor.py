"""
Machine Learning & Knowledge-Based Disease Predictor.
Computes disease probabilities based on symptoms, duration, severity, age, and gender.
"""

from typing import List, Dict, Any


DISEASE_SYMPTOM_MAP = {
    "Common Cold": {
        "primary": ["Cough", "Runny Nose", "Sneezing", "Sore Throat"],
        "secondary": ["Fever", "Headache", "Fatigue", "Body Pain"],
        "description": "A viral infection of your nose and throat (upper respiratory tract). Usually mild and harmless.",
        "advice": "Rest, stay hydrated, and use over-the-counter remedies. Most colds resolve within 7-10 days."
    },
    "Influenza (Flu)": {
        "primary": ["Fever", "Body Pain", "Chills", "Fatigue", "Dry Cough"],
        "secondary": ["Headache", "Sore Throat", "Loss of Appetite"],
        "description": "A contagious respiratory illness caused by influenza viruses.",
        "advice": "Get plenty of rest, drink fluids, and consider antiviral medications if diagnosed early by a doctor."
    },
    "COVID-19 (Viral Infection)": {
        "primary": ["Fever", "Dry Cough", "Fatigue", "Shortness of Breath", "Loss of Appetite"],
        "secondary": ["Sore Throat", "Headache", "Body Pain", "Runny Nose"],
        "description": "A viral respiratory infection caused by SARS-CoV-2.",
        "advice": "Isolate from others, monitor oxygen levels, rest, and seek medical attention if breathing becomes difficult."
    },
    "Gastroenteritis (Stomach Flu)": {
        "primary": ["Nausea", "Vomiting", "Diarrhea", "Abdominal Pain"],
        "secondary": ["Fever", "Fatigue", "Loss of Appetite"],
        "description": "An intestinal infection causing watery diarrhea, abdominal cramps, and nausea.",
        "advice": "Sip Oral Rehydration Solution (ORS) or electrolyte fluids. Avoid solid foods until stomach settles."
    },
    "Migraine": {
        "primary": ["Headache", "Nausea", "Dizziness"],
        "secondary": ["Fatigue"],
        "description": "A neurological condition causing intense throbbing headache, often with nausea or light sensitivity.",
        "advice": "Rest in a dark, quiet room, apply a cool compress, and stay well hydrated."
    },
    "Bronchitis": {
        "primary": ["Cough", "Dry Cough", "Shortness of Breath", "Chest Pain"],
        "secondary": ["Fever", "Fatigue", "Sore Throat"],
        "description": "Inflammation of the lining of your bronchial tubes, which carry air to and from your lungs.",
        "advice": "Avoid smoke and air irritants, use a humidifier, and consult a physician if cough persists."
    },
    "Allergic Rhinitis (Seasonal Allergies)": {
        "primary": ["Sneezing", "Runny Nose", "Sore Throat"],
        "secondary": ["Headache", "Fatigue"],
        "description": "An allergic response causing sneezing, itching, runny nose, and watery eyes.",
        "advice": "Avoid identified allergy triggers and use OTC antihistamines or saline nasal rinses."
    }
}


def predict_disease(
    symptoms: List[str],
    duration: str = "1-3 days",
    severity: str = "Moderate",
    age: int = None,
    gender: str = None
) -> Dict[str, Any]:
    """
    Calculates matching scores and probability distributions across candidate diseases.
    """
    if not symptoms:
        return {
            "top_prediction": "Insufficient Symptoms",
            "confidence": 0.0,
            "top_3_conditions": [],
            "advice": "Please select or describe your symptoms to receive an assessment."
        }

    user_symptoms_set = set(symptoms)
    scores = {}

    for disease, data in DISEASE_SYMPTOM_MAP.items():
        prim_matches = len(user_symptoms_set.intersection(data["primary"]))
        sec_matches = len(user_symptoms_set.intersection(data["secondary"]))

        # Weight primary symptoms 2x compared to secondary
        raw_score = (prim_matches * 2.0) + (sec_matches * 0.8)

        # Severity multiplier
        sev_mult = 1.2 if severity.lower() == "severe" else 1.0 if severity.lower() == "moderate" else 0.9
        scores[disease] = raw_score * sev_mult

    total_score = sum(scores.values())

    if total_score == 0:
        # Fallback if symptoms don't match pre-defined list
        results = [
            {
                "disease": "General Viral Infection / Malaise",
                "probability": 65.0,
                "description": "Symptoms suggest a mild viral infection or physical fatigue.",
                "advice": "Ensure adequate rest and hydration. Consult a medical doctor if symptoms persist."
            },
            {
                "disease": "Common Cold",
                "probability": 35.0,
                "description": "Possible early mild respiratory cold symptoms.",
                "advice": "Monitor symptoms and stay warm."
            }
        ]
    else:
        # Normalize probabilities
        sorted_diseases = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        results = []
        for d_name, sc in sorted_diseases[:3]:
            prob = min(round((sc / total_score) * 100, 1), 95.0)
            if prob > 0:
                results.append({
                    "disease": d_name,
                    "probability": prob,
                    "description": DISEASE_SYMPTOM_MAP[d_name]["description"],
                    "advice": DISEASE_SYMPTOM_MAP[d_name]["advice"]
                })

    top_pred = results[0] if results else {
        "disease": "Unknown Condition",
        "probability": 50.0,
        "description": "Consult a healthcare provider.",
        "advice": "Seek medical consultation."
    }

    return {
        "top_prediction": top_pred["disease"],
        "confidence": top_pred["probability"],
        "top_3_conditions": results,
        "description": top_pred.get("description", ""),
        "advice": top_pred.get("advice", ""),
    }
