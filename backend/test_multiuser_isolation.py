"""
Automated Multi-User Data Isolation Verification Test Script.
"""

import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8005/api"


def make_request(url, method="GET", body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    data_bytes = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req) as resp:
            raw_data = resp.read()
            try:
                data = raw_data.decode("utf-8")
                return resp.status, json.loads(data) if data else {}
            except Exception:
                return resp.status, {"raw_bytes": len(raw_data)}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        try:
            err_json = json.loads(err_body)
        except Exception:
            err_json = {"detail": err_body}
        return e.code, err_json


def run_isolation_tests():
    print("==================================================")
    print("  RUNNING MULTI-USER DATA ISOLATION TEST SUITE")
    print("==================================================")

    # 1. Register User 1
    u1_payload = {
        "full_name": "User One",
        "email": "user1@test.com",
        "password": "Test@12345",
        "confirm_password": "Test@12345",
        "age": 25,
        "gender": "male"
    }
    status, u1_res = make_request(f"{BASE_URL}/auth/register", "POST", u1_payload)
    if status == 409:  # Already exists, perform login
        status, u1_res = make_request(f"{BASE_URL}/auth/login", "POST", {"email": "user1@test.com", "password": "Test@12345"})

    assert status in (200, 201), f"User 1 auth failed: {u1_res}"
    u1_token = u1_res["access_token"]
    u1_id = u1_res["user"]["id"]
    print(f"[OK] User 1 Authenticated (ID: {u1_id}, Email: user1@test.com)")

    # 2. Register User 2
    u2_payload = {
        "full_name": "User Two",
        "email": "user2@test.com",
        "password": "Test@12345",
        "confirm_password": "Test@12345",
        "age": 30,
        "gender": "female"
    }
    status, u2_res = make_request(f"{BASE_URL}/auth/register", "POST", u2_payload)
    if status == 409:
        status, u2_res = make_request(f"{BASE_URL}/auth/login", "POST", {"email": "user2@test.com", "password": "Test@12345"})

    assert status in (200, 201), f"User 2 auth failed: {u2_res}"
    u2_token = u2_res["access_token"]
    u2_id = u2_res["user"]["id"]
    print(f"[OK] User 2 Authenticated (ID: {u2_id}, Email: user2@test.com)")

    # 3. User 1 creates Assessment
    status, u1_pred = make_request(
        f"{BASE_URL}/prediction",
        "POST",
        {"symptoms": ["Fever", "Cough", "Sore Throat"], "duration": "1-3 days", "severity": "Moderate"},
        token=u1_token
    )
    assert status == 200, f"User 1 prediction creation failed: {u1_pred}"
    u1_assessment_id = u1_pred["assessment_id"]
    print(f"[OK] User 1 created Assessment ID: {u1_assessment_id}")

    # Generate User 1 Report
    status, u1_rep = make_request(
        f"{BASE_URL}/reports",
        "POST",
        {"assessment_id": u1_assessment_id},
        token=u1_token
    )
    assert status == 200, f"User 1 report generation failed: {u1_rep}"
    u1_report_id = u1_rep["report_id"]
    print(f"[OK] User 1 generated Report ID: {u1_report_id}")

    # 4. User 2 checks History -> MUST NOT see User 1 assessment
    status, u2_hist = make_request(f"{BASE_URL}/prediction/history", "GET", token=u2_token)
    assert status == 200, f"User 2 history fetch failed: {u2_hist}"
    u2_assessments = u2_hist["assessments"]
    u1_ids_in_u2_hist = [a["id"] for a in u2_assessments if a["id"] == u1_assessment_id]
    assert len(u1_ids_in_u2_hist) == 0, "[FAIL] DATA LEAK: User 2 saw User 1's assessment in history!"
    print(f"[OK] ISOLATION PASSED: User 2 history contains {len(u2_assessments)} records (User 1 data invisible).")

    # 5. User 2 creates Assessment
    status, u2_pred = make_request(
        f"{BASE_URL}/prediction",
        "POST",
        {"symptoms": ["Headache", "Dizziness", "Nausea"], "duration": "4-7 days", "severity": "Severe"},
        token=u2_token
    )
    assert status == 200, f"User 2 prediction creation failed: {u2_pred}"
    u2_assessment_id = u2_pred["assessment_id"]
    print(f"[OK] User 2 created Assessment ID: {u2_assessment_id}")

    # 6. User 1 checks History -> MUST NOT see User 2 assessment
    status, u1_hist = make_request(f"{BASE_URL}/prediction/history", "GET", token=u1_token)
    assert status == 200, f"User 1 history fetch failed: {u1_hist}"
    u1_assessments = u1_hist["assessments"]
    u2_ids_in_u1_hist = [a["id"] for a in u1_assessments if a["id"] == u2_assessment_id]
    assert len(u2_ids_in_u1_hist) == 0, "[FAIL] DATA LEAK: User 1 saw User 2's assessment in history!"
    print(f"[OK] ISOLATION PASSED: User 1 history contains ONLY User 1 data (User 2 data invisible).")

    # 7. Security Test: User 2 attempts to download User 1's PDF Report -> MUST be BLOCKED with 403 Forbidden
    status, u2_pdf_res = make_request(f"{BASE_URL}/reports/{u1_report_id}/pdf", "GET", token=u2_token)
    assert status == 403, f"[FAIL] SECURITY VULNERABILITY: User 2 accessed User 1's PDF report! (Status: {status})"
    print(f"[OK] SECURITY PASSED: User 2 attempted to fetch User 1 PDF report -> Blocked with HTTP 403 Forbidden.")

    # 8. Role-Based Security Test: Normal User (User 1) attempts to access Admin endpoints -> MUST be BLOCKED with 403 Forbidden
    status, admin_res = make_request(f"{BASE_URL}/admin/statistics", "GET", token=u1_token)
    assert status == 403, f"[FAIL] ROLE SECURITY VULNERABILITY: Normal user accessed admin stats! (Status: {status})"
    print(f"[OK] ROLE SECURITY PASSED: Normal user attempted to access /api/admin/statistics -> Blocked with HTTP 403 Forbidden.")

    # 9. Admin User Auth & Admin Endpoint Access Test
    status, admin_login = make_request(f"{BASE_URL}/auth/login", "POST", {"email": "admin@aihealth.com", "password": "Admin1234!"})
    assert status == 200, f"Admin login failed: {admin_login}"
    admin_token = admin_login["access_token"]

    status, admin_stats = make_request(f"{BASE_URL}/admin/statistics", "GET", token=admin_token)
    assert status == 200, f"Admin stats fetch failed: {admin_stats}"
    print(f"[OK] ADMIN PASSED: System Admin accessed /api/admin/statistics (Total Users: {admin_stats['total_users']}, Total Assessments: {admin_stats['total_assessments']}).")

    print("\n==================================================")
    print("  ALL MULTI-USER ISOLATION & SECURITY TESTS PASSED!")
    print("==================================================")


if __name__ == "__main__":
    run_isolation_tests()
