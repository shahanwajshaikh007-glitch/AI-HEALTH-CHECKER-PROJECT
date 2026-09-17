"""
NLP Symptom Extractor & Emergency Safety Evaluator.
Extracts symptoms from natural language text / speech and flags critical red-flag emergency symptoms.
"""

import re
from typing import List, Dict, Any, Tuple

# Red-flag emergency symptoms and trigger keywords
EMERGENCY_TRIGGERS = [
    {
        "keyword": "chest pain",
        "warning": "Chest pain or severe tightness in the chest can be a sign of a cardiac event.",
    },
    {
        "keyword": "severe chest pain",
        "warning": "Severe chest pain requires urgent emergency medical evaluation immediately.",
    },
    {
        "keyword": "shortness of breath",
        "warning": "Severe difficulty breathing or shortness of breath requires immediate emergency care.",
    },
    {
        "keyword": "difficulty breathing",
        "warning": "Difficulty breathing is a medical emergency requiring urgent attention.",
    },
    {
        "keyword": "can't breathe",
        "warning": "Acute breathing distress requires urgent medical evaluation.",
    },
    {
        "keyword": "cannot breathe",
        "warning": "Acute breathing distress requires urgent medical evaluation.",
    },
    {
        "keyword": "thunderclap headache",
        "warning": "Sudden, excruciating headache may indicate a severe neurological emergency.",
    },
    {
        "keyword": "coughing blood",
        "warning": "Coughing up blood requires urgent medical evaluation.",
    },
    {
        "keyword": "loss of consciousness",
        "warning": "Fainting or loss of consciousness is an emergency warning sign.",
    },
    {
        "keyword": "fainting",
        "warning": "Fainting or sudden loss of consciousness requires immediate medical checkup.",
    },
    {
        "keyword": "unconsciousness",
        "warning": "Unconsciousness is a critical medical emergency.",
    },
    {
        "keyword": "stroke",
        "warning": "Sudden numbness, facial drooping, or speech difficulty requires emergency medical care.",
    },
    {
        "keyword": "stroke symptoms",
        "warning": "Signs of stroke (FAST: Face, Arms, Speech, Time) require immediate emergency action.",
    },
    {
        "keyword": "severe allergic reaction",
        "warning": "Severe allergic reaction (anaphylaxis) requires immediate emergency medical care and epinephrine if available.",
    },
    {
        "keyword": "anaphylaxis",
        "warning": "Anaphylactic shock is a life-threatening emergency requiring urgent medical attention.",
    },
    {
        "keyword": "suicidal thoughts",
        "warning": "If you are experiencing suicidal thoughts or mental health crisis, please contact emergency services or a national suicide crisis helpline immediately.",
    },
    {
        "keyword": "suicide",
        "warning": "Immediate crisis support is available. Please reach out to emergency services or a crisis helpline right now.",
    },
    {
        "keyword": "self harm",
        "warning": "Please seek urgent support from a healthcare provider or crisis helpline.",
    },
    {
        "keyword": " छाती में दर्द",
        "warning": "Chest pain warning (Hindi): Requires immediate medical checkup.",
    },
    {
        "keyword": "सांस लेने में तकलीफ",
        "warning": "Breathing distress warning (Hindi): Requires urgent care.",
    },
]

# Mapping of keywords & synonyms to normalized symptom names
SYMPTOM_DICTIONARY = {
    "fever": "Fever",
    "high temperature": "Fever",
    "feverish": "Fever",
    "बुखार": "Fever",
    "ताप": "Fever",

    "headache": "Headache",
    "head pain": "Headache",
    "pain in head": "Headache",
    "head throbbing": "Headache",
    "सिर दर्द": "Headache",
    "डोकेदुखी": "Headache",

    "cough": "Cough",
    "coughing": "Cough",
    "खांसी": "Cough",
    "खोकला": "Cough",

    "dry cough": "Dry Cough",
    "dry coughing": "Dry Cough",
    "सूखी खांसी": "Dry Cough",
    "कोरडा खोकला": "Dry Cough",

    "fatigue": "Fatigue",
    "tiredness": "Fatigue",
    "feeling weak": "Fatigue",
    "exhausted": "Fatigue",
    "थकान": "Fatigue",
    "थकवा": "Fatigue",

    "body pain": "Body Pain",
    "body ache": "Body Pain",
    "muscle pain": "Body Pain",
    "aches": "Body Pain",
    "बदन दर्द": "Body Pain",
    "अंगदुखी": "Body Pain",

    "sore throat": "Sore Throat",
    "throat pain": "Sore Throat",
    "throat irritation": "Sore Throat",
    "गले में खराश": "Sore Throat",

    "shortness of breath": "Shortness of Breath",
    "difficulty breathing": "Shortness of Breath",
    "can't breathe": "Shortness of Breath",
    "breathlessness": "Shortness of Breath",
    "सांस लेने में तकलीफ": "Shortness of Breath",

    "chest pain": "Chest Pain",
    "chest pressure": "Chest Pain",
    "छाती में दर्द": "Chest Pain",

    "nausea": "Nausea",
    "feeling sick": "Nausea",
    "queasy": "Nausea",

    "vomiting": "Vomiting",
    "throwing up": "Vomiting",
    "vomit": "Vomiting",

    "diarrhea": "Diarrhea",
    "loose motion": "Diarrhea",
    "watery stool": "Diarrhea",

    "abdominal pain": "Abdominal Pain",
    "stomach pain": "Abdominal Pain",
    "stomach ache": "Abdominal Pain",
    "stomach cramps": "Abdominal Pain",

    "dizziness": "Dizziness",
    "dizzy": "Dizziness",
    "lightheaded": "Dizziness",

    "joint pain": "Joint Pain",
    "back pain": "Back Pain",
    "runny nose": "Runny Nose",
    "sneezing": "Sneezing",
    "chills": "Chills",
    "loss of appetite": "Loss of Appetite",
}


def extract_symptoms_and_emergencies(text: str) -> Tuple[List[str], bool, List[str]]:
    """
    Analyzes input text to extract matched symptoms and evaluate emergency flags.
    Returns: (detected_symptoms_list, is_emergency, emergency_warnings_list)
    """
    if not text or not text.strip():
        return [], False, []

    lowered = text.lower()
    detected_symptoms = set()
    emergency_warnings = []
    is_emergency = False

    # Check emergency triggers
    for trig in EMERGENCY_TRIGGERS:
        if trig["keyword"] in lowered:
            is_emergency = True
            if trig["warning"] not in emergency_warnings:
                emergency_warnings.append(trig["warning"])

    # Extract symptoms using dictionary keyword matching
    for phrase, std_name in SYMPTOM_DICTIONARY.items():
        if re.search(r'\b' + re.escape(phrase) + r'\b', lowered) or phrase in lowered:
            detected_symptoms.add(std_name)

    return list(detected_symptoms), is_emergency, emergency_warnings
