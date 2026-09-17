# Cloudflare Backend — AI Health Checker

This directory contains the production-ready **Cloudflare Workers** backend powered by **Cloudflare D1** (Serverless SQL Database) and **Workers AI**.

---

## 🏗️ Architecture

```text
       React / Vite Frontend (Local: :5173 / Cloudflare Pages)
                               │
                               ▼
        Cloudflare Workers API (Local: :8787 / Cloudflare Edge)
                   (Hono + Web Crypto + JWT)
            ┌──────────────────┬──────────────────┐
            ▼                  ▼                  ▼
      NLP & ML Engine     Workers AI       Cloudflare D1 DB
    (Symptom Extraction &   (LLM Chat       (Serverless SQL:
    Disease Prediction)   Assistant)       Users, Assessments,
                                          Predictions, Chats)
```

---

## 🚀 Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Local Cloudflare D1 Database
Initialize tables, schemas, and indexes:
```bash
npm run db:setup
```

Seed initial standard symptoms, diseases, model metrics, and default admin:
```bash
npm run db:seed
```

### 3. Configure Secrets (Local Development)
Copy `.dev.vars.example` to `.dev.vars` or set your secret:
```bash
cp .dev.vars.example .dev.vars
```
Make sure `JWT_SECRET` is set in `.dev.vars`:
```env
JWT_SECRET=ai-health-checker-cloud-flare-super-secret-key-2026
```

### 4. Start Cloudflare Worker Locally
```bash
npm run dev
```
The Cloudflare Worker will start on `http://127.0.0.1:8787`.

---

## 🧪 Run Automated Integration Tests

Run the full end-to-end multi-user isolation test:
```bash
python test_cloudflare_api.py
```

---

## 🔑 Default Credentials

- **Admin Account**:
  - **Email**: `admin@aihealth.com`
  - **Password**: `Admin1234!`
- **User Registration**:
  - Register any new independent user via `POST /api/auth/register` or the frontend at `http://localhost:5173/register`.

---

## 🌐 Deploying to Cloudflare (Production)

### 1. Login to Cloudflare CLI
```bash
npx wrangler login
```

### 2. Create Cloudflare D1 Database
```bash
npx wrangler d1 create ai_health_checker
```
Copy the `database_id` output by Wrangler and update `wrangler.jsonc`:
```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "ai_health_checker",
    "database_id": "<YOUR_D1_DATABASE_ID>"
  }
]
```

### 3. Execute Remote Schema & Seed
```bash
npx wrangler d1 execute ai_health_checker --remote --file=./schema.sql
npx wrangler d1 execute ai_health_checker --remote --file=./seed.sql
```

### 4. Set Production Secrets
```bash
npx wrangler secret put JWT_SECRET
```
(Enter your long random secret key when prompted)

### 5. Deploy the Worker
```bash
npm run deploy
```
Your backend will be instantly live on `https://ai-health-checker-api.<your-subdomain>.workers.dev`!

### 6. Deploy Frontend to Cloudflare Pages
In the `frontend` folder:
```bash
npm run build
npx wrangler pages deploy dist --project-name ai-health-checker
```
