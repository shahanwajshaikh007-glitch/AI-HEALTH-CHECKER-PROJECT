# 🏥 AI Medical Symptom Assistant & Educational Health Evaluator

> **Educational and Informational Purposes Only** — This application does NOT provide medical diagnoses and does NOT replace a qualified healthcare professional.

A complete, modern, full-stack AI medical symptom checker platform with speech/voice input, NLP keyword extraction, machine learning disease prediction, Cloudflare Workers AI assistant, and automated PDF health reports.

---

## 🚀 Tech Stack Overview

| Component | Primary Tech | Secondary / Alternative |
|---|---|---|
| **Frontend** | React 19 + Vite 8 + Tailwind CSS 4 | Browser Web Speech API |
| **Primary Backend** | Cloudflare Workers + Hono + Cloudflare D1 SQL (Port 8787) | Serverless Edge |
| **Secondary Backend** | Python 3.11 + FastAPI + MongoDB (Port 8005) | Local Uvicorn |
| **ML Engine** | Edge JS Weighted Scoring Engine | scikit-learn Random Forest Classifier |
| **NLP Engine** | Custom JS Pattern Extractor & Red-Flag Evaluator | NLTK + spaCy |
| **AI Assistant** | Cloudflare Workers AI (Llama LLM) | Google Gemini AI |
| **Auth & Security** | JWT HS256 + bcrypt password hashing | Per-User Data Isolation |

---

## 📁 Project Structure

```text
AI HELATH CHECKER PROJECT/
├── frontend/              # React 19 Web Application (Vite + TailwindCSS)
├── cloudflare-backend/    # Primary Edge API (Cloudflare Workers + Hono + D1 SQL)
├── backend/               # Secondary API (Python FastAPI + MongoDB)
├── ml/                    # Machine Learning dataset & model training scripts
├── reports/               # Generated PDF health assessment reports
├── README.md
└── .gitignore
```

---

## ⚡ Quick Start

### 1. Cloudflare Workers Backend (Primary — Port 8787)
```bash
cd cloudflare-backend

# Install dependencies
npm install

# Setup local D1 database schema and seed data
npm run db:setup
npm run db:seed

# Configure local development environment secrets
cp .dev.vars.example .dev.vars

# Start local server
npm run dev
```
Primary API will be running live at `http://127.0.0.1:8787`.

### 2. React Frontend Application (Port 5173)
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
Open your browser at `http://localhost:5173`.

### 3. Python FastAPI Backend (Optional Secondary — Port 8005)
```bash
cd backend

# Activate virtual environment
venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Start FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8005
```
Access Swagger API Documentation at `http://127.0.0.1:8005/docs`.

---

## 🧪 Testing & Verification

- **Cloudflare Workers API Integration Test**:
  ```bash
  cd cloudflare-backend
  python test_cloudflare_api.py
  ```
- **Frontend Production Build Test**:
  ```bash
  cd frontend
  npm run build
  ```

---

## 🔑 Security & Production Environment

1. **JWT Secrets**: Secrets are never hardcoded in `wrangler.jsonc` or source code.
   - **Local**: Managed in `.dev.vars` (ignored by Git).
   - **Production**: Configured via Cloudflare CLI: `npx wrangler secret put JWT_SECRET`.
2. **CORS Restrictions**: Workers allow only `http://localhost:5173`, `http://127.0.0.1:5173`, and `*.pages.dev` deployment domains. Unknown origins are rejected.
3. **Data Isolation**: All database queries enforce strict per-user `user_id` scoping.
4. **Emergency Red Flags**: Automatic detection triggers immediate warnings for severe symptoms (e.g., severe chest pain, breathing distress, stroke signs, fainting, severe allergic reactions, suicidal crisis).

---

## ⚠️ Medical Disclaimer

This application is for **educational and informational purposes only**.
It does **not** provide medical diagnoses, treatment, or clinical advice.
Always consult a qualified healthcare professional or call emergency services for medical emergencies.
