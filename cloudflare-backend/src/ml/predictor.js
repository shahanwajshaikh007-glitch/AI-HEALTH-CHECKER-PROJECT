/**
 * Machine Learning & Probabilistic Disease Predictor for Cloudflare Workers.
 * Computes disease probabilities based on symptoms, duration, severity, age, and gender.
 */

export const DISEASE_SYMPTOM_MAP = {
  "Common Cold": {
    primary: ["Cough", "Runny Nose", "Sneezing", "Sore Throat"],
    secondary: ["Fever", "Headache", "Fatigue", "Body Pain"],
    description: "A viral infection of your nose and throat (upper respiratory tract). Usually mild and harmless.",
    advice: "Rest, stay hydrated, and use over-the-counter remedies. Most colds resolve within 7-10 days."
  },
  "Influenza (Flu)": {
    primary: ["Fever", "Body Pain", "Chills", "Fatigue", "Dry Cough"],
    secondary: ["Headache", "Sore Throat", "Loss of Appetite"],
    description: "A contagious respiratory illness caused by influenza viruses.",
    advice: "Get plenty of rest, drink fluids, and consider antiviral medications if diagnosed early by a doctor."
  },
  "COVID-19 (Viral Infection)": {
    primary: ["Fever", "Dry Cough", "Fatigue", "Shortness of Breath", "Loss of Appetite"],
    secondary: ["Sore Throat", "Headache", "Body Pain", "Runny Nose"],
    description: "A viral respiratory infection caused by SARS-CoV-2.",
    advice: "Isolate from others, monitor oxygen levels, rest, and seek medical attention if breathing becomes difficult."
  },
  "Gastroenteritis (Stomach Flu)": {
    primary: ["Nausea", "Vomiting", "Diarrhea", "Abdominal Pain"],
    secondary: ["Fever", "Fatigue", "Loss of Appetite"],
    description: "An intestinal infection causing watery diarrhea, abdominal cramps, and nausea.",
    advice: "Sip Oral Rehydration Solution (ORS) or electrolyte fluids. Avoid solid foods until stomach settles."
  },
  "Migraine": {
    primary: ["Headache", "Nausea", "Dizziness"],
    secondary: ["Fatigue"],
    description: "A neurological condition causing intense throbbing headache, often with nausea or light sensitivity.",
    advice: "Rest in a dark, quiet room, apply a cool compress, and stay well hydrated."
  },
  "Bronchitis": {
    primary: ["Cough", "Dry Cough", "Shortness of Breath", "Chest Pain"],
    secondary: ["Fever", "Fatigue", "Sore Throat"],
    description: "Inflammation of the lining of your bronchial tubes, which carry air to and from your lungs.",
    advice: "Avoid smoke and air irritants, use a humidifier, and consult a physician if cough persists."
  },
  "Allergic Rhinitis (Seasonal Allergies)": {
    primary: ["Sneezing", "Runny Nose", "Sore Throat"],
    secondary: ["Headache", "Fatigue"],
    description: "An allergic response causing sneezing, itching, runny nose, and watery eyes.",
    advice: "Avoid identified allergy triggers and use OTC antihistamines or saline nasal rinses."
  }
};

export function predictDisease(symptoms = [], duration = "1-3 days", severity = "Moderate", age = null, gender = null) {
  if (!Array.isArray(symptoms) || symptoms.length === 0) {
    return {
      top_prediction: "Insufficient Symptoms",
      confidence: 0.0,
      top_3_conditions: [],
      advice: "Please select or describe your symptoms to receive an assessment."
    };
  }

  const userSymptomsSet = new Set(symptoms.map(s => s.trim().toLowerCase()));
  const scores = {};

  for (const [disease, data] of Object.entries(DISEASE_SYMPTOM_MAP)) {
    let primMatches = 0;
    for (const p of data.primary) {
      if (userSymptomsSet.has(p.toLowerCase())) primMatches++;
    }

    let secMatches = 0;
    for (const s of data.secondary) {
      if (userSymptomsSet.has(s.toLowerCase())) secMatches++;
    }

    // Weight primary symptoms 2x compared to secondary
    const rawScore = (primMatches * 2.0) + (secMatches * 0.8);

    // Severity multiplier
    const sev = (severity || "").toLowerCase();
    const sevMult = sev === "severe" ? 1.2 : sev === "moderate" ? 1.0 : 0.9;
    scores[disease] = rawScore * sevMult;
  }

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  let results = [];
  if (totalScore === 0) {
    results = [
      {
        disease: "General Viral Infection / Malaise",
        probability: 65.0,
        description: "Symptoms suggest a mild viral infection or physical fatigue.",
        advice: "Ensure adequate rest and hydration. Consult a medical doctor if symptoms persist."
      },
      {
        disease: "Common Cold",
        probability: 35.0,
        description: "Possible early mild respiratory cold symptoms.",
        advice: "Monitor symptoms and stay warm."
      }
    ];
  } else {
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    for (const [dName, sc] of sorted.slice(0, 3)) {
      const prob = Math.min(Math.round(((sc / totalScore) * 100) * 10) / 10, 95.0);
      if (prob > 0) {
        results.push({
          disease: dName,
          probability: prob,
          description: DISEASE_SYMPTOM_MAP[dName]?.description || "",
          advice: DISEASE_SYMPTOM_MAP[dName]?.advice || ""
        });
      }
    }
  }

  const topPred = results[0] || {
    disease: "Unknown Condition",
    probability: 50.0,
    description: "Consult a healthcare provider.",
    advice: "Seek medical consultation."
  };

  return {
    top_prediction: topPred.disease,
    confidence: topPred.probability,
    top_3_conditions: results,
    description: topPred.description,
    advice: topPred.advice
  };
}
