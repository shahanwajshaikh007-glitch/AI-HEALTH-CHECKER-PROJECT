"""
Comprehensive Integration & Multi-User Isolation Test Suite for Cloudflare Workers & D1.
"""
import sys
import io
import httpx

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE = "http://127.0.0.1:8787/api"
PASS = "[PASS]"
FAIL = "[FAIL]"

def register_or_login(email, name, pw="Test1234!"):
    r = httpx.post(f"{BASE}/auth/register", json={
        "full_name": name,
        "email": email,
        "password": pw,
        "confirm_password": pw,
        "language": "en"
    }, timeout=15.0)
    if r.status_code == 409:
        r = httpx.post(f"{BASE}/auth/login", json={"email": email, "password": pw}, timeout=15.0)
    if r.status_code not in (200, 201):
        print(f"{FAIL} Could not register/login {email}: {r.text}")
        sys.exit(1)
    return r.json()["access_token"]

def H(token):
    return {"Authorization": f"Bearer {token}"}

def main():
    print()
    print("=" * 60)
    print("  Cloudflare Workers + D1 Integration & Isolation Tests")
    print("=" * 60)

    # [0] Health Check
    print("\n[0] Health Check")
    h = httpx.get(f"{BASE}/health", timeout=15.0).json()
    print(f"     status={h['status']} | database={h['database']} | runtime={h['runtime']}")
    assert h["status"] == "healthy"
    assert h["database"] == "connected"
    print(f"    {PASS} Cloudflare Worker is healthy, D1 database connected")

    import time
    ts = int(time.time())
    emailA = f"cf_alice_{ts}@health.com"
    emailB = f"cf_bob_{ts}@health.com"

    # [1] Register two independent users
    print("\n[1] Registering Users (Multi-User System)")
    tA = register_or_login(emailA, "Alice Explorer")
    tB = register_or_login(emailB, "Bob Tester")
    assert tA != tB, "Tokens must be unique!"
    print(f"    {PASS} Alice and Bob have distinct JWT tokens")

    # [2] Profile retrieval & update
    print("\n[2] Profile Verification")
    pA = httpx.get(f"{BASE}/profile", headers=H(tA)).json()
    pB = httpx.get(f"{BASE}/profile", headers=H(tB)).json()
    assert pA["email"] == emailA
    assert pB["email"] == emailB
    print(f"    {PASS} Alice profile: {pA['email']} | Bob profile: {pB['email']}")

    pUpdate = httpx.put(f"{BASE}/profile", json={"age": 28, "gender": "female"}, headers=H(tA)).json()
    assert pUpdate["user"]["age"] == 28
    print(f"    {PASS} Profile update successful in D1")

    # [3] Symptoms catalog & NLP analysis
    print("\n[3] Symptoms Catalog & NLP Analysis")
    syms = httpx.get(f"{BASE}/symptoms").json().get("symptoms", [])
    assert len(syms) >= 15, f"Expected at least 15 symptoms, got {len(syms)}"
    print(f"    {PASS} Loaded {len(syms)} symptoms from D1")

    nlp = httpx.post(f"{BASE}/symptoms/analyze", json={
        "text": "I have severe chest pain and high fever since yesterday."
    }).json()
    assert nlp["is_emergency"] is True
    assert "Fever" in nlp["extracted_symptoms"] or "Chest Pain" in nlp["extracted_symptoms"]
    print(f"    {PASS} NLP extraction detected: {nlp['extracted_symptoms']} | Emergency: {nlp['is_emergency']}")

    # [4] Alice creates assessment & prediction
    print("\n[4] Alice Performs Assessment & ML Prediction")
    predA = httpx.post(f"{BASE}/prediction", json={
        "symptoms": ["Fever", "Cough", "Headache"],
        "duration": "2 days",
        "severity": "Moderate",
        "input_method": "text"
    }, headers=H(tA)).json()

    assIdA = predA["assessment_id"]
    print(f"    {PASS} Assessment created in D1: {assIdA}")
    print(f"    {PASS} Prediction: {predA['top_prediction']} ({predA['confidence']}%)")

    # [5] Alice sends AI Assistant chat
    print("\n[5] Alice Chats with AI Medical Assistant")
    chatA = httpx.post(f"{BASE}/chat", json={
        "message": "What should I do to reduce my fever?"
    }, headers=H(tA)).json()
    print(f"    {PASS} AI Assistant replied successfully")

    # [6] Bob verifies his history is empty (User Isolation Before)
    print("\n[6] Bob Data Isolation Check (Before Creating Data)")
    histB_before = httpx.get(f"{BASE}/prediction/history", headers=H(tB)).json().get("assessments", [])
    assert len(histB_before) == 0, f"BREACH: Bob sees {len(histB_before)} assessments from Alice!"
    print(f"    {PASS} Bob sees 0 assessments (Alice's data is strictly isolated)")

    chatB_before = httpx.get(f"{BASE}/chat/history", headers=H(tB)).json().get("messages", [])
    assert len(chatB_before) == 0, f"BREACH: Bob sees {len(chatB_before)} messages from Alice!"
    print(f"    {PASS} Bob sees 0 chat messages (Alice's chat is strictly isolated)")

    # [7] Bob creates his own assessment & chat
    print("\n[7] Bob Creates Own Assessment & Chat")
    predB = httpx.post(f"{BASE}/prediction", json={
        "symptoms": ["Nausea", "Vomiting", "Abdominal Pain"],
        "duration": "1 day",
        "severity": "Mild",
        "input_method": "voice"
    }, headers=H(tB)).json()
    assIdB = predB["assessment_id"]

    httpx.post(f"{BASE}/chat", json={"message": "I feel nauseous"}, headers=H(tB))
    print(f"    {PASS} Bob assessment created: {assIdB} | Top: {predB['top_prediction']}")

    # [8] Alice only sees her own data
    print("\n[8] Alice Isolation Check")
    histA = httpx.get(f"{BASE}/prediction/history", headers=H(tA)).json().get("assessments", [])
    idsA = {item["id"] for item in histA}
    assert assIdA in idsA, "Alice missing own assessment!"
    assert assIdB not in idsA, "BREACH: Alice sees Bob's assessment!"
    print(f"    {PASS} Alice sees her own assessment only")

    # [9] Bob only sees his own data
    print("\n[9] Bob Isolation Check")
    histB = httpx.get(f"{BASE}/prediction/history", headers=H(tB)).json().get("assessments", [])
    idsB = {item["id"] for item in histB}
    assert assIdB in idsB, "Bob missing own assessment!"
    assert assIdA not in idsB, "BREACH: Bob sees Alice's assessment!"
    print(f"    {PASS} Bob sees his own assessment only")

    # [10] Alice generates PDF Report & tests access control
    print("\n[10] PDF Report Generation & Security Isolation")
    repA = httpx.post(f"{BASE}/reports", json={"assessment_id": assIdA}, headers=H(tA)).json()
    repIdA = repA["report_id"]
    print(f"    {PASS} Report generated in D1: {repIdA}")

    # Alice downloads her report -> should be 200 OK
    pdfA = httpx.get(f"{BASE}/reports/{repIdA}/pdf", headers=H(tA))
    assert pdfA.status_code == 200
    assert pdfA.headers.get("content-type") == "application/pdf"
    assert len(pdfA.content) > 500
    print(f"    {PASS} Alice successfully downloaded PDF report ({len(pdfA.content)} bytes)")

    # Bob attempts to download Alice's report -> MUST be 403 Forbidden!
    pdfB_unauth = httpx.get(f"{BASE}/reports/{repIdA}/pdf", headers=H(tB))
    assert pdfB_unauth.status_code == 403, f"Expected 403, got {pdfB_unauth.status_code}"
    print(f"    {PASS} Unauthorized report download blocked with 403 Forbidden")

    # [11] Admin Access Control
    print("\n[11] Admin Access Control")
    unauth_admin = httpx.get(f"{BASE}/admin/statistics", headers=H(tA))
    assert unauth_admin.status_code == 403
    print(f"    {PASS} Non-admin user blocked with 403 Forbidden")

    # Admin Login
    tAdmin = register_or_login("admin@aihealth.com", "Admin", "Admin1234!")
    adminStats = httpx.get(f"{BASE}/admin/statistics", headers=H(tAdmin)).json()
    print(f"     users={adminStats['total_users']} | assessments={adminStats['total_assessments']} | db={adminStats['database']}")
    assert adminStats["database"] == "Cloudflare D1"
    assert adminStats["total_users"] >= 3
    print(f"    {PASS} Admin dashboard verified on Cloudflare D1")

    print()
    print("=" * 60)
    print("  ALL 11 CLOUDFLARE INTEGRATION TESTS PASSED [OK]")
    print("=" * 60)
    print()

if __name__ == "__main__":
    main()
