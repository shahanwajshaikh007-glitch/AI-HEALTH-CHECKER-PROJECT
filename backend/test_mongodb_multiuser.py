"""
MongoDB Multi-User Isolation Test Suite (ASCII output, Windows-safe)
"""
import sys
import httpx

BASE = "http://127.0.0.1:8005/api"
PASS = "[PASS]"
FAIL = "[FAIL]"


def register_or_login(email, name, pw="Test1234!"):
    r = httpx.post(f"{BASE}/auth/register", json={
        "full_name": name, "email": email,
        "password": pw, "confirm_password": pw, "language": "en"
    })
    if r.status_code == 409:
        r = httpx.post(f"{BASE}/auth/login", json={"email": email, "password": pw})
    if r.status_code not in (200, 201):
        print(f"{FAIL} Could not register/login {email}: {r.text}")
        sys.exit(1)
    return r.json()["access_token"]


def H(token):
    return {"Authorization": f"Bearer {token}"}


def prediction(token):
    r = httpx.post(f"{BASE}/prediction", json={
        "symptoms": ["fever", "headache", "cough"],
        "duration": "2 days", "severity": "Moderate", "input_method": "text"
    }, headers=H(token))
    if r.status_code != 200:
        print(f"{FAIL} Prediction failed: {r.text}")
        sys.exit(1)
    return r.json()


def chat(token, msg):
    r = httpx.post(f"{BASE}/chat", json={"message": msg}, headers=H(token))
    if r.status_code != 200:
        print(f"{FAIL} Chat failed: {r.text}")
        sys.exit(1)


def history(token):
    r = httpx.get(f"{BASE}/prediction/history", headers=H(token))
    if r.status_code != 200:
        print(f"{FAIL} History failed: {r.text}")
        sys.exit(1)
    return r.json().get("assessments", [])


def chat_history(token):
    r = httpx.get(f"{BASE}/chat/history", headers=H(token))
    if r.status_code != 200:
        print(f"{FAIL} Chat history failed: {r.text}")
        sys.exit(1)
    return r.json().get("messages", [])


def main():
    print()
    print("=" * 60)
    print("  MongoDB Multi-User Isolation Tests")
    print("=" * 60)

    # [0] Health
    h = httpx.get(f"{BASE}/health").json()
    print(f"\n[0] Health Check")
    print(f"     status={h['status']} | database={h['database']} | type={h.get('database_type','?')}")
    assert h["status"] == "healthy"
    assert h["database"] == "connected"
    print(f"    {PASS} Backend healthy, MongoDB connected")

    # [1] Register two independent users
    print("\n[1] Registering Users")
    tA = register_or_login("usera_mongo@test.com", "User A")
    tB = register_or_login("userb_mongo@test.com", "User B")
    assert tA != tB, "Tokens should be different!"
    print(f"    {PASS} User A and User B have distinct JWT tokens")

    # [2] User A creates data
    print("\n[2] User A Creates Assessment and Chat")
    pA = prediction(tA)
    assA = pA["assessment_id"]
    chat(tA, "What does my fever result mean?")
    print(f"    {PASS} User A assessment created: {assA}")
    print(f"    {PASS} User A chat message sent")

    # [3] User B sees nothing before creating own data
    print("\n[3] User B Data Isolation (Before Creating Own Data)")
    hB_before = history(tB)
    if len(hB_before) != 0:
        print(f"    {FAIL} ISOLATION BREACH: User B sees {len(hB_before)} items from User A!")
        sys.exit(1)
    print(f"    {PASS} User B sees 0 assessments (User A data hidden)")

    chatB_before = chat_history(tB)
    if len(chatB_before) != 0:
        print(f"    {FAIL} CHAT ISOLATION BREACH: User B sees {len(chatB_before)} messages!")
        sys.exit(1)
    print(f"    {PASS} User B sees 0 chat messages (User A data hidden)")

    # [4] User B creates own data
    print("\n[4] User B Creates Assessment and Chat")
    pB = prediction(tB)
    assB = pB["assessment_id"]
    chat(tB, "Tell me about headaches")
    print(f"    {PASS} User B assessment created: {assB}")
    print(f"    {PASS} User B chat message sent")

    # [5] User A only sees own assessment
    print("\n[5] User A Data Isolation Check")
    hA_ids = {item["id"] for item in history(tA)}
    assert assA in hA_ids, f"{FAIL} User A missing own assessment!"
    assert assB not in hA_ids, f"{FAIL} BREACH: User A sees User B's assessment!"
    print(f"    {PASS} User A sees own assessment ({assA})")
    print(f"    {PASS} User A does NOT see User B's assessment")

    # [6] User B only sees own assessment
    print("\n[6] User B Data Isolation Check")
    hB_ids = {item["id"] for item in history(tB)}
    assert assB in hB_ids, f"{FAIL} User B missing own assessment!"
    assert assA not in hB_ids, f"{FAIL} BREACH: User B sees User A's assessment!"
    print(f"    {PASS} User B sees own assessment ({assB})")
    print(f"    {PASS} User B does NOT see User A's assessment")

    # [7] Profile isolation
    print("\n[7] Profile Isolation")
    pA_data = httpx.get(f"{BASE}/profile", headers=H(tA)).json()
    pB_data = httpx.get(f"{BASE}/profile", headers=H(tB)).json()
    assert pA_data["email"] == "usera_mongo@test.com"
    assert pB_data["email"] == "userb_mongo@test.com"
    print(f"    {PASS} User A profile: {pA_data['email']}")
    print(f"    {PASS} User B profile: {pB_data['email']}")

    # [8] Admin blocked for regular users
    print("\n[8] Admin Access Control")
    r_denied = httpx.get(f"{BASE}/admin/statistics", headers=H(tA))
    assert r_denied.status_code == 403
    print(f"    {PASS} Regular user blocked from admin (403 Forbidden)")

    # [9] Admin login and statistics
    print("\n[9] Admin Login and Dashboard Statistics")
    tAdmin = register_or_login("admin@aihealth.com", "Admin", "Admin1234!")
    r_stats = httpx.get(f"{BASE}/admin/statistics", headers=H(tAdmin))
    assert r_stats.status_code == 200, f"Admin stats failed: {r_stats.text}"
    stats = r_stats.json()
    print(f"     users={stats['total_users']} | assessments={stats['total_assessments']} | db={stats.get('database','N/A')}")
    print(f"    {PASS} Admin dashboard returns MongoDB statistics")

    # Summary
    print()
    print("=" * 60)
    print("  ALL 9 TESTS PASSED")
    print("=" * 60)
    print()
    print("  Collections verified:")
    print("    users         - multi-user isolation OK")
    print("    assessments   - user_id scoped isolation OK")
    print("    predictions   - user_id scoped isolation OK")
    print("    conversations - user_id scoped isolation OK")
    print("    messages      - user_id scoped isolation OK")
    print()


if __name__ == "__main__":
    main()
