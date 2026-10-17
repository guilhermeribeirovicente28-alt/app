# Regression tests for Inimigo das Provas API (auth, train, simulado, progress, chat, AI tools, plan, isolation)
import json
import os
import uuid
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


def _register(prefix="TEST_"):
    email = f"{prefix.lower()}{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={"name": "TEST_User", "email": email, "password": "senha123",
                                                    "grade": "ENEM"})
    assert r.status_code == 200, r.text
    d = r.json()
    return {"email": email, "token": d["token"], "user": d["user"],
            "h": {"Authorization": f"Bearer {d['token']}"}}


def _sse(resp):
    text, done, err = "", False, None
    for line in resp.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data: "):
            continue
        ev = json.loads(line[6:])
        if "t" in ev:
            text += ev["t"]
        if ev.get("done"):
            done = True
        if ev.get("error"):
            err = ev
    return text, done, err


@pytest.fixture(scope="module")
def ua():
    return _register()


@pytest.fixture(scope="module")
def ub():
    return _register()


# ---------- auth ----------
class TestAuth:
    def test_admin_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": "admin@inimigodasprovas.com", "password": "Admin@2026"})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"

    def test_register_and_me(self, ua):
        r = requests.get(f"{API}/auth/me", headers=ua["h"])
        assert r.status_code == 200
        assert r.json()["email"] == ua["email"]
        assert "password_hash" not in r.json()

    def test_duplicate_register(self, ua):
        r = requests.post(f"{API}/auth/register", json={"name": "X", "email": ua["email"], "password": "senha123"})
        assert r.status_code == 400

    def test_login_wrong_password(self, ua):
        r = requests.post(f"{API}/auth/login", json={"email": ua["email"], "password": "errada"})
        assert r.status_code == 401
        assert "detail" in r.json()

    def test_login_ok_uppercase_email(self, ua):
        r = requests.post(f"{API}/auth/login", json={"email": ua["email"].upper(), "password": "senha123"})
        assert r.status_code == 200

    def test_no_token_401(self):
        assert requests.get(f"{API}/auth/me").status_code == 401
        assert requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer abc"}).status_code == 401

    def test_patch_profile(self, ua):
        r = requests.patch(f"{API}/auth/me", headers=ua["h"], json={"name": "TEST_Renamed", "grade": "9º ano"})
        assert r.status_code == 200
        me = requests.get(f"{API}/auth/me", headers=ua["h"]).json()
        assert me["name"] == "TEST_Renamed" and me["grade"] == "9º ano"

    def test_bruteforce_lockout(self):
        u = _register()
        codes = [requests.post(f"{API}/auth/login", json={"email": u["email"], "password": "bad"}).status_code
                 for _ in range(6)]
        assert codes[-1] == 429, codes


# ---------- meta / train / attempts ----------
class TestTrain:
    def test_meta(self, ua):
        r = requests.get(f"{API}/meta", headers=ua["h"])
        assert r.status_code == 200
        d = r.json()
        assert "ENEM" in d["grades"] and len(d["subjects"]) > 0

    def test_train_next_and_attempt_xp(self, ua):
        r = requests.get(f"{API}/train/next", headers=ua["h"])
        assert r.status_code == 200
        q = r.json()["question"]
        assert len(q["opts"]) == 4 and 0 <= q["ans"] <= 3 and "_id" not in q
        r2 = requests.post(f"{API}/attempts", headers=ua["h"], json={"mode": "treino", "entries": [
            {"question_id": q["id"], "correct": True, "used_hint": True}]})
        assert r2.json()["xp"] == 5
        wrong_err = next(e for i, e in enumerate(q["err"]) if i != q["ans"])
        r3 = requests.post(f"{API}/attempts", headers=ua["h"], json={"entries": [
            {"question_id": q["id"], "correct": False, "err": wrong_err}]})
        assert r3.json()["xp"] == 0
        rev = requests.get(f"{API}/train/next", headers=ua["h"], params={"filter": "Revanche"}).json()
        assert rev["question"]["id"] == q["id"]

    def test_empty_grade_filter(self, ua):
        r = requests.get(f"{API}/train/next", headers=ua["h"], params={"filter": "1º ano"})
        assert r.status_code == 200
        print("1º ano pool", r.json()["pool"])

    def test_invalid_qid_attempt(self, ua):
        r = requests.post(f"{API}/attempts", headers=ua["h"], json={"entries": [{"question_id": "bad", "correct": True}]})
        assert r.status_code in (400, 404, 422)


# ---------- simulado / progress ----------
class TestSimuladoProgress:
    def test_simulado_flow(self, ua):
        qs = requests.get(f"{API}/simulado", headers=ua["h"], params={"n": 5}).json()
        assert 1 <= len(qs) <= 5
        entries = [{"question_id": q["id"], "correct": i == 0, "err": None if i == 0 else "conc"} for i, q in enumerate(qs)]
        r = requests.post(f"{API}/simulados", headers=ua["h"], json={"subj": "Todas", "seconds": 60, "entries": entries})
        assert r.status_code == 200 and r.json()["hits"] == 1 and r.json()["xp"] == 10
        p = requests.get(f"{API}/progress", headers=ua["h"]).json()
        assert p["xp"] == 15 and len(p["simulados"]) == 1 and p["streak"] == 1
        assert p["errs"]["conc"] >= len(qs) - 1
        assert p["today"]["answered"] == 2 + len(qs)

    def test_simulado_ids(self, ua):
        qs = requests.get(f"{API}/simulado", headers=ua["h"], params={"n": 3}).json()
        ids = ",".join(q["id"] for q in qs)
        r = requests.get(f"{API}/simulado", headers=ua["h"], params={"ids": ids}).json()
        assert sorted(q["id"] for q in r) == sorted(q["id"] for q in qs)

    def test_reset_progress(self, ub):
        q = requests.get(f"{API}/train/next", headers=ub["h"]).json()["question"]
        requests.post(f"{API}/attempts", headers=ub["h"], json={"entries": [{"question_id": q["id"], "correct": True}]})
        assert requests.get(f"{API}/progress", headers=ub["h"]).json()["xp"] == 10
        assert requests.delete(f"{API}/progress", headers=ub["h"]).status_code == 200
        assert requests.get(f"{API}/progress", headers=ub["h"]).json()["xp"] == 0


# ---------- custom questions + isolation ----------
class TestQuestionsIsolation:
    def test_custom_question_crud_and_isolation(self, ua, ub):
        body = {"subj": "TEST_Materia", "grade": "ENEM", "topic": "TEST_topic", "level": 2, "prompt": "TEST 2+2?",
                "opts": ["3", "4", "5", "6"], "ans": 1, "err": ["calc", None, "calc", "distr"]}
        r = requests.post(f"{API}/questions", headers=ua["h"], json=body)
        assert r.status_code == 200
        qid = r.json()["id"]
        mine = requests.get(f"{API}/questions", headers=ua["h"], params={"mine": True}).json()
        assert any(q["id"] == qid for q in mine)
        allb = requests.get(f"{API}/questions", headers=ub["h"]).json()
        assert not any(q["id"] == qid for q in allb)
        assert "TEST_Materia" not in requests.get(f"{API}/meta", headers=ub["h"]).json()["subjects"]
        assert requests.get(f"{API}/simulado", headers=ub["h"], params={"ids": qid}).json() == []
        assert requests.delete(f"{API}/questions/{qid}", headers=ub["h"]).status_code == 404
        assert requests.delete(f"{API}/questions/{qid}", headers=ua["h"]).status_code == 200
        mine = requests.get(f"{API}/questions", headers=ua["h"], params={"mine": True}).json()
        assert not any(q["id"] == qid for q in mine)

    def test_invalid_question_422(self, ua):
        r = requests.post(f"{API}/questions", headers=ua["h"], json={"subj": "x", "grade": "ENEM", "topic": "t",
                                                                     "level": 2, "prompt": "p", "opts": ["a"],
                                                                     "ans": 0, "err": [None]})
        assert r.status_code == 422


# ---------- plan ----------
class TestPlan:
    def test_plan_flow_and_isolation(self, ua, ub):
        assert requests.post(f"{API}/plan", headers=ua["h"], json={
            "exam_name": "TEST", "exam_date": date.today().isoformat(), "subjects": ["Matemática"],
            "minutes_per_day": 60, "weekdays": [0]}).status_code in (400, 422)
        exam = (date.today() + timedelta(days=30)).isoformat()
        r = requests.post(f"{API}/plan", headers=ua["h"], json={
            "exam_name": "TEST_ENEM", "exam_date": exam, "subjects": ["Matemática", "Português"],
            "minutes_per_day": 60, "weekdays": [0, 1, 2, 3, 4]})
        assert r.status_code == 200
        plan = r.json()["plan"]
        assert plan["exam_name"] == "TEST_ENEM" and len(plan["days"]) > 0
        tid = plan["days"][0]["tasks"][0]["id"]
        assert requests.patch(f"{API}/plan/tasks/{tid}", headers=ua["h"], json={"done": True}).status_code == 200
        p = requests.get(f"{API}/plan", headers=ua["h"]).json()["plan"]
        assert p["days"][0]["tasks"][0]["done"] is True
        assert requests.get(f"{API}/plan", headers=ub["h"]).json()["plan"] is None
        assert requests.patch(f"{API}/plan/tasks/{tid}", headers=ub["h"], json={"done": True}).status_code == 404
        assert requests.delete(f"{API}/plan", headers=ua["h"]).status_code == 200
        assert requests.get(f"{API}/plan", headers=ua["h"]).json()["plan"] is None


# ---------- chat + AI ----------
class TestChatAI:
    def test_chat_flow_and_isolation(self, ua, ub):
        s = requests.post(f"{API}/chat/sessions", headers=ua["h"]).json()
        sid = s["id"]
        r = requests.post(f"{API}/chat/sessions/{sid}/messages", headers=ua["h"], json={"text": "O que é 2+2? Responda curto."},
                          stream=True, timeout=120)
        text, done, err = _sse(r)
        assert err is None, err
        assert done and len(text) > 0
        msgs = requests.get(f"{API}/chat/sessions/{sid}/messages", headers=ua["h"]).json()
        assert [m["role"] for m in msgs] == ["user", "assistant"]
        sessions = requests.get(f"{API}/chat/sessions", headers=ua["h"]).json()
        assert sessions[0]["title"].startswith("O que é 2+2")
        assert requests.get(f"{API}/chat/sessions", headers=ub["h"]).json() == []
        assert requests.get(f"{API}/chat/sessions/{sid}/messages", headers=ub["h"]).json() == []
        assert requests.post(f"{API}/chat/sessions/{sid}/messages", headers=ub["h"], json={"text": "oi"}).status_code == 404
        assert requests.delete(f"{API}/chat/sessions/{sid}", headers=ub["h"]).status_code == 404
        assert requests.delete(f"{API}/chat/sessions/{sid}", headers=ua["h"]).status_code == 200

    def test_ai_learn_stream(self, ua):
        r = requests.post(f"{API}/ai/learn", headers=ua["h"], json={"topic": "Frações", "grade": "5º ano"},
                          stream=True, timeout=180)
        text, done, err = _sse(r)
        assert err is None and done and "##" in text

    def test_ai_material_short_422(self, ua):
        assert requests.post(f"{API}/ai/material", headers=ua["h"], json={"text": "curto"}).status_code == 422

    def test_ai_questions(self, ua, ub):
        r = requests.post(f"{API}/ai/questions", headers=ua["h"],
                          json={"subj": "Matemática", "topic": "Porcentagem", "grade": "1º ano", "level": 1, "n": 3},
                          timeout=180)
        assert r.status_code == 200, r.text
        qs = r.json()
        assert len(qs) >= 1
        for q in qs:
            assert len(q["opts"]) == 4 and q["err"][q["ans"]] is None and q["source"] == "ai"
        ids = ",".join(q["id"] for q in qs)
        assert requests.get(f"{API}/simulado", headers=ub["h"], params={"ids": ids}).json() == []
        for q in qs:
            requests.delete(f"{API}/questions/{q['id']}", headers=ua["h"])
