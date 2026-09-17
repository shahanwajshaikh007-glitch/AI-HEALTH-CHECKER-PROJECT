-- Seed initial data for Cloudflare D1 Database

-- 1. Default Admin User (Password: Admin1234!)
INSERT OR IGNORE INTO users (id, full_name, name, email, password_hash, role, age, gender, language, created_at, updated_at)
VALUES (
    'admin_user_001',
    'System Administrator',
    'System Administrator',
    'admin@aihealth.com',
    '$2a$10$lv/tec2nWULUrTvY56UlXuc4DwYMhQexGT.LLD6t8uDK4o7twKety',
    'admin',
    35,
    'other',
    'en',
    datetime('now'),
    datetime('now')
);

-- 2. Standard Symptoms
INSERT OR IGNORE INTO symptoms (id, name, normalized_name, category, description, created_at) VALUES
('sym_01', 'Fever', 'fever', 'General', 'Elevated body temperature above 98.6°F (37°C).', datetime('now')),
('sym_02', 'Fatigue', 'fatigue', 'General', 'Feeling constantly weak, tired, or lacking energy.', datetime('now')),
('sym_03', 'Chills', 'chills', 'General', 'Feelings of coldness accompanied by shivering.', datetime('now')),
('sym_04', 'Body Pain', 'body_pain', 'General', 'Generalized muscle and body aches.', datetime('now')),
('sym_05', 'Loss of Appetite', 'loss_of_appetite', 'General', 'Reduced desire to eat.', datetime('now')),
('sym_06', 'Cough', 'cough', 'Respiratory', 'Sudden expulsion of air from the lungs.', datetime('now')),
('sym_07', 'Dry Cough', 'dry_cough', 'Respiratory', 'Tickling cough that does not produce mucus.', datetime('now')),
('sym_08', 'Sore Throat', 'sore_throat', 'Respiratory', 'Pain, scratchiness or irritation of the throat.', datetime('now')),
('sym_09', 'Runny Nose', 'runny_nose', 'Respiratory', 'Excess mucus discharging from the nasal passages.', datetime('now')),
('sym_10', 'Sneezing', 'sneezing', 'Respiratory', 'Involuntary, sudden discharge of air from nose and mouth.', datetime('now')),
('sym_11', 'Shortness of Breath', 'shortness_of_breath', 'Respiratory', 'Difficulty or discomfort in breathing.', datetime('now')),
('sym_12', 'Chest Pain', 'chest_pain', 'Respiratory', 'Discomfort or pain felt anywhere along the front of the chest.', datetime('now')),
('sym_13', 'Nausea', 'nausea', 'Digestive', 'Urge or feeling like vomiting.', datetime('now')),
('sym_14', 'Vomiting', 'vomiting', 'Digestive', 'Involuntary throwing up of stomach contents.', datetime('now')),
('sym_15', 'Diarrhea', 'diarrhea', 'Digestive', 'Frequent, loose, or watery bowel movements.', datetime('now')),
('sym_16', 'Abdominal Pain', 'abdominal_pain', 'Digestive', 'Cramping or pain in the stomach/abdomen area.', datetime('now')),
('sym_17', 'Headache', 'headache', 'Neurological', 'Pain in any region of the head.', datetime('now')),
('sym_18', 'Dizziness', 'dizziness', 'Neurological', 'Lightheadedness, feeling faint or unsteady.', datetime('now')),
('sym_19', 'Joint Pain', 'joint_pain', 'Musculoskeletal', 'Discomfort or inflammation in one or more joints.', datetime('now')),
('sym_20', 'Back Pain', 'back_pain', 'Musculoskeletal', 'Ache or pain in the spinal region or lower back.', datetime('now'));

-- 3. Standard Diseases Knowledge Base
INSERT OR IGNORE INTO diseases (id, name, description, general_information, warning_signs, created_at) VALUES
('dis_01', 'Common Cold', 'A viral infection of your nose and throat (upper respiratory tract). Usually mild and harmless.', 'Rest, stay hydrated, and use over-the-counter remedies. Most colds resolve within 7-10 days.', '["High persistent fever above 102°F", "Shortness of breath", "Symptoms lasting longer than 10 days"]', datetime('now')),
('dis_02', 'Influenza (Flu)', 'A contagious respiratory illness caused by influenza viruses.', 'Get plenty of rest, drink fluids, and consider antiviral medications if diagnosed early by a doctor.', '["Difficulty breathing", "Persistent chest pressure", "Sudden dizziness", "Severe vomiting"]', datetime('now')),
('dis_03', 'COVID-19 (Viral Infection)', 'A viral respiratory infection caused by SARS-CoV-2.', 'Isolate from others, monitor oxygen levels, rest, and seek medical attention if breathing becomes difficult.', '["Trouble breathing", "Persistent pain or pressure in the chest", "New confusion", "Pale/blue skin tone"]', datetime('now')),
('dis_04', 'Gastroenteritis (Stomach Flu)', 'An intestinal infection causing watery diarrhea, abdominal cramps, and nausea.', 'Sip Oral Rehydration Solution (ORS) or electrolyte fluids. Avoid solid foods until stomach settles.', '["Inability to keep liquids down for 24 hours", "Signs of severe dehydration", "Blood in vomit or stool"]', datetime('now')),
('dis_05', 'Migraine', 'A neurological condition causing intense throbbing headache, often with nausea or light sensitivity.', 'Rest in a dark, quiet room, apply a cool compress, and stay well hydrated.', '["Sudden severe headache like a thunderclap", "Headache with fever and stiff neck", "Numbness or speech difficulty"]', datetime('now')),
('dis_06', 'Bronchitis', 'Inflammation of the lining of your bronchial tubes, which carry air to and from your lungs.', 'Avoid smoke and air irritants, use a humidifier, and consult a physician if cough persists.', '["Coughing up blood", "Wheezing", "Fever over 101°F", "Shortness of breath at rest"]', datetime('now')),
('dis_07', 'Allergic Rhinitis (Seasonal Allergies)', 'An allergic response causing sneezing, itching, runny nose, and watery eyes.', 'Avoid identified allergy triggers and use OTC antihistamines or saline nasal rinses.', '["Severe wheezing", "Hives", "Swelling of lips, tongue, or throat"]', datetime('now'));

-- 4. Initial Model Metrics
INSERT OR IGNORE INTO model_versions (id, model_name, version, accuracy, precision, recall, f1_score, dataset_size, trained_at) VALUES
('mod_01', 'Random Forest Classifier (Edge/Workers Engine)', 'v1.0.0', 0.925, 0.910, 0.930, 0.920, 4920, datetime('now'));
