from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import base64
import io
import json
import logging
import os
import random
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, FastAPI, File, HTTPException, Request, UploadFile
from pypdf import PdfReader
from pypdf.errors import PdfReadError
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

import ai
from core import (TZ, Attempt, ChatMessage, ChatSession, Question, Simulado, StudyPlan, User, client,
                  create_access_token, db, get_current_user, hash_password, now_iso, oid, today_key,
                  verify_password, visible_filter)
from plan import DEFAULT_TOPICS, build_days

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()
api = APIRouter(prefix="/api")

GRADES = ["1º ano", "2º ano", "3º ano", "4º ano", "5º ano", "6º ano", "7º ano", "8º ano", "9º ano",
          "1º EM", "2º EM", "3º EM", "ENEM", "Vestibular", "Concurso", "Faculdade"]
XP_PER_LEVEL = 150
DAILY_GOAL = 10


# ---------- schemas ----------
class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    grade: str = "ENEM"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProfileIn(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=60)
    grade: Optional[str] = None


class AttemptIn(BaseModel):
    question_id: str
    correct: bool
    err: Optional[str] = None
    used_hint: bool = False


class AttemptsIn(BaseModel):
    mode: str = "treino"
    entries: List[AttemptIn]


class SimuladoIn(BaseModel):
    subj: str = "Todas"
    seconds: int = 0
    entries: List[AttemptIn]


class QuestionIn(BaseModel):
    subj: str = Field(min_length=1, max_length=60)
    grade: str
    topic: str = Field(min_length=1, max_length=80)
    level: int = Field(ge=1, le=3)
    prompt: str = Field(min_length=1, max_length=2000)
    opts: List[str] = Field(min_length=4, max_length=4)
    ans: int = Field(ge=0, le=3)
    err: List[Optional[str]] = Field(min_length=4, max_length=4)
    hint: str = ""
    why: str = ""


class ChatIn(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class LearnIn(BaseModel):
    topic: str = Field(min_length=1, max_length=200)
    grade: str = "ENEM"


class MaterialIn(BaseModel):
    text: str = Field(min_length=20, max_length=30000)
    mode: str = "resumo"


class GenerateIn(BaseModel):
    subj: str = Field(min_length=1, max_length=60)
    topic: str = Field(default="", max_length=120)
    grade: str = "ENEM"
    level: int = Field(default=2, ge=1, le=3)
    n: int = Field(default=5, ge=1, le=10)


class PlanIn(BaseModel):
    exam_name: str = Field(min_length=1, max_length=80)
    exam_date: date
    subjects: List[str] = Field(min_length=1, max_length=12)
    minutes_per_day: int = Field(ge=20, le=600)
    weekdays: List[int] = Field(min_length=1, max_length=7)


class TaskIn(BaseModel):
    done: bool


# ---------- helpers ----------
def mix(q: Question) -> dict:
    ix = list(range(4))
    random.shuffle(ix)
    d = q.model_dump()
    d["opts"] = [q.opts[i] for i in ix]
    d["err"] = [q.err[i] for i in ix]
    d["ans"] = ix.index(q.ans)
    return d


async def topic_wrong_rates(user_id: str) -> dict:
    rows = await db.attempts.aggregate([
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": "$topic", "n": {"$sum": 1}, "wrong": {"$sum": {"$cond": ["$correct", 0, 1]}}}},
    ]).to_list(1000)
    return {r["_id"]: r["wrong"] / r["n"] for r in rows}


def streak_of(days: set) -> int:
    d = datetime.now(TZ).date()
    if d.isoformat() not in days:
        d -= timedelta(days=1)
    n = 0
    while d.isoformat() in days:
        n += 1
        d -= timedelta(days=1)
    return n


async def record_attempts(user: User, entries: List[AttemptIn], mode: str) -> int:
    ids = [oid(e.question_id) for e in entries]
    qmap = {str(q["_id"]): Question.from_mongo(q) for q in
            await db.questions.find({"_id": {"$in": ids}, **visible_filter(user)}).to_list(500)}
    docs, xp = [], 0
    for e in entries:
        q = qmap.get(e.question_id)
        if not q:
            continue
        gained = (5 if e.used_hint else 10) if e.correct else 0
        xp += gained
        docs.append(Attempt(user_id=user.id, question_id=q.id, topic=q.topic, subj=q.subj, correct=e.correct,
                            err=None if e.correct else e.err, xp=gained, mode=mode).to_mongo())
    if docs:
        await db.attempts.insert_many(docs)
    return xp


# ---------- auth ----------
@api.post("/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Este e-mail já está cadastrado")
    user = User(email=email, name=body.name.strip(), grade=body.grade if body.grade in GRADES else "ENEM",
                password_hash=hash_password(body.password))
    res = await db.users.insert_one(user.to_mongo())
    user.id = str(res.inserted_id)
    return {"token": create_access_token(user.id, email), "user": user.public()}


@api.post("/auth/login")
async def login(body: LoginIn, request: Request):
    email = body.email.lower()
    ident = f"{request.client.host if request.client else 'x'}:{email}"
    rec = await db.login_attempts.find_one({"identifier": ident})
    if rec and rec.get("count", 0) >= 5 and rec.get("locked_until", "") > now_iso():
        raise HTTPException(status_code=429, detail="Muitas tentativas. Tente de novo em 15 minutos.")
    user = User.from_mongo(await db.users.find_one({"email": email}))
    if not user or not verify_password(body.password, user.password_hash):
        count = (rec.get("count", 0) if rec else 0) + 1
        locked = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat() if count >= 5 else ""
        await db.login_attempts.update_one({"identifier": ident},
                                           {"$set": {"count": count, "locked_until": locked}}, upsert=True)
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")
    await db.login_attempts.delete_one({"identifier": ident})
    return {"token": create_access_token(user.id, email), "user": user.public()}


@api.get("/auth/me")
async def me(user: User = Depends(get_current_user)):
    return user.public()


@api.patch("/auth/me")
async def update_me(body: ProfileIn, user: User = Depends(get_current_user)):
    upd = {}
    if body.name:
        upd["name"] = body.name.strip()
    if body.grade in GRADES:
        upd["grade"] = body.grade
    if upd:
        await db.users.update_one({"_id": oid(user.id)}, {"$set": upd})
    return User.from_mongo(await db.users.find_one({"_id": oid(user.id)})).public()


# ---------- meta & questions ----------
@api.get("/meta")
async def meta(user: User = Depends(get_current_user)):
    subjects = sorted(await db.questions.distinct("subj", visible_filter(user)))
    return {"grades": GRADES, "subjects": subjects, "plan_subjects": sorted(set(subjects) | set(DEFAULT_TOPICS))}


@api.get("/questions")
async def list_questions(mine: bool = False, user: User = Depends(get_current_user)):
    q = {"owner_id": user.id} if mine else visible_filter(user)
    docs = await db.questions.find(q).sort("created_at", -1).to_list(1000)
    return [Question.from_mongo(d).model_dump() for d in docs]


@api.post("/questions")
async def create_question(body: QuestionIn, user: User = Depends(get_current_user)):
    err = [None if i == body.ans else (e if e in ai.ERR_TYPES else "conc") for i, e in enumerate(body.err)]
    q = Question(subj=body.subj.strip(), grade=body.grade, topic=body.topic.strip(), level=body.level,
                 prompt=body.prompt.strip(), opts=[o.strip() for o in body.opts], ans=body.ans, err=err,
                 hint=body.hint.strip() or "Releia o enunciado com calma.",
                 why=body.why.strip() or f"A alternativa certa é a {'ABCD'[body.ans]}.",
                 source="custom", owner_id=user.id)
    res = await db.questions.insert_one(q.to_mongo())
    q.id = str(res.inserted_id)
    return q.model_dump()


@api.delete("/questions/{qid}")
async def delete_question(qid: str, user: User = Depends(get_current_user)):
    res = await db.questions.delete_one({"_id": oid(qid), "owner_id": user.id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    return {"ok": True}


# ---------- treino ----------
@api.get("/train/next")
async def train_next(filter: str = "Todas", subj: str = "Todas", exclude: Optional[str] = None,
                     user: User = Depends(get_current_user)):
    q = visible_filter(user)
    if subj != "Todas":
        q["subj"] = subj
    if filter == "Revanche":
        last = {}
        async for a in db.attempts.find({"user_id": user.id}, {"question_id": 1, "correct": 1}).sort("created_at", 1):
            last[a["question_id"]] = a["correct"]
        q["_id"] = {"$in": [oid(k) for k, v in last.items() if v is False]}
    elif filter != "Todas":
        q["grade"] = filter
    pool = [Question.from_mongo(d) for d in await db.questions.find(q).to_list(3000)]
    cands = [p for p in pool if p.id != exclude] or pool
    if not cands:
        return {"question": None, "pool": 0}
    rates = await topic_wrong_rates(user.id)
    weights = [1 + (1.5 if rates.get(c.topic) is None else rates[c.topic] * 3) for c in cands]
    return {"question": mix(random.choices(cands, weights=weights, k=1)[0]), "pool": len(pool)}


@api.post("/attempts")
async def post_attempts(body: AttemptsIn, user: User = Depends(get_current_user)):
    xp = await record_attempts(user, body.entries, body.mode if body.mode in ("treino", "simulado") else "treino")
    return {"xp": xp}


# ---------- simulado ----------
@api.get("/simulado")
async def get_simulado(subj: str = "Todas", grade: str = "Todas", n: int = 10, ids: str = "",
                       user: User = Depends(get_current_user)):
    q = visible_filter(user)
    if ids:
        q["_id"] = {"$in": [oid(i) for i in ids.split(",") if i]}
    else:
        if subj != "Todas":
            q["subj"] = subj
        if grade != "Todas":
            q["grade"] = grade
    pool = [Question.from_mongo(d) for d in await db.questions.find(q).to_list(3000)]
    random.shuffle(pool)
    return [mix(p) for p in pool[:max(1, min(n, 45)) if not ids else len(pool)]]


@api.post("/simulados")
async def post_simulado(body: SimuladoIn, user: User = Depends(get_current_user)):
    xp = await record_attempts(user, body.entries, "simulado")
    hits = sum(1 for e in body.entries if e.correct)
    sim = Simulado(user_id=user.id, subj=body.subj, total=len(body.entries), hits=hits, seconds=max(0, body.seconds))
    await db.simulados.insert_one(sim.to_mongo())
    return {"xp": xp, "hits": hits, "total": len(body.entries)}


# ---------- progresso ----------
@api.get("/progress")
async def progress(user: User = Depends(get_current_user)):
    atts = await db.attempts.find({"user_id": user.id}, {"_id": 0, "correct": 1, "err": 1, "xp": 1, "topic": 1,
                                                         "subj": 1, "day": 1}).to_list(200000)
    xp = sum(a["xp"] for a in atts)
    ok = sum(1 for a in atts if a["correct"])
    errs = {k: 0 for k in ai.ERR_TYPES}
    topics, subjects, daily = defaultdict(lambda: [0, 0, ""]), defaultdict(lambda: [0, 0]), defaultdict(lambda: [0, 0])
    for a in atts:
        if a.get("err") in errs:
            errs[a["err"]] += 1
        t = topics[a["topic"]]
        t[0] += 1; t[1] += a["correct"]; t[2] = a["subj"]
        s = subjects[a["subj"]]
        s[0] += 1; s[1] += a["correct"]
        dd = daily[a["day"]]
        dd[0] += a["xp"]; dd[1] += 1
    today = datetime.now(TZ).date()
    last14 = [(today - timedelta(days=i)).isoformat() for i in range(13, -1, -1)]
    sims = await db.simulados.find({"user_id": user.id}).sort("created_at", -1).to_list(10)
    tk = today_key()
    today_ok = sum(1 for a in atts if a["day"] == tk and a["correct"])
    return {
        "xp": xp, "total": len(atts), "acc": round(ok / len(atts) * 100) if atts else None,
        "streak": streak_of({a["day"] for a in atts}),
        "level": xp // XP_PER_LEVEL + 1, "level_progress": round((xp % XP_PER_LEVEL) / XP_PER_LEVEL * 100),
        "xp_to_next": XP_PER_LEVEL - xp % XP_PER_LEVEL,
        "today": {"answered": daily[tk][1] if tk in daily else 0, "correct": today_ok, "goal": DAILY_GOAL},
        "errs": errs,
        "topics": sorted([{"topic": k, "subj": v[2], "n": v[0], "ok": v[1], "pct": round(v[1] / v[0] * 100)}
                          for k, v in topics.items()], key=lambda x: x["pct"]),
        "subjects": sorted([{"subj": k, "n": v[0], "ok": v[1], "pct": round(v[1] / v[0] * 100)}
                            for k, v in subjects.items()], key=lambda x: -x["n"]),
        "daily": [{"day": d, "xp": daily[d][0] if d in daily else 0, "n": daily[d][1] if d in daily else 0}
                  for d in last14],
        "simulados": [Simulado.from_mongo(s).model_dump() for s in sims],
    }


@api.delete("/progress")
async def reset_progress(user: User = Depends(get_current_user)):
    await db.attempts.delete_many({"user_id": user.id})
    await db.simulados.delete_many({"user_id": user.id})
    return {"ok": True}


# ---------- professor (chat) ----------
@api.get("/chat/sessions")
async def chat_sessions(user: User = Depends(get_current_user)):
    docs = await db.chat_sessions.find({"user_id": user.id}).sort("updated_at", -1).to_list(100)
    return [ChatSession.from_mongo(d).model_dump() for d in docs]


@api.post("/chat/sessions")
async def new_session(user: User = Depends(get_current_user)):
    s = ChatSession(user_id=user.id)
    res = await db.chat_sessions.insert_one(s.to_mongo())
    s.id = str(res.inserted_id)
    return s.model_dump()


@api.delete("/chat/sessions/{sid}")
async def delete_session(sid: str, user: User = Depends(get_current_user)):
    res = await db.chat_sessions.delete_one({"_id": oid(sid), "user_id": user.id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Conversa não encontrada")
    await db.chat_messages.delete_many({"session_id": sid, "user_id": user.id})
    return {"ok": True}


@api.get("/chat/sessions/{sid}/messages")
async def session_messages(sid: str, user: User = Depends(get_current_user)):
    docs = await db.chat_messages.find({"session_id": sid, "user_id": user.id}).sort("created_at", 1).to_list(500)
    return [ChatMessage.from_mongo(d).model_dump() for d in docs]


@api.post("/chat/sessions/{sid}/messages")
async def send_message(sid: str, body: ChatIn, user: User = Depends(get_current_user)):
    session = ChatSession.from_mongo(await db.chat_sessions.find_one({"_id": oid(sid), "user_id": user.id}))
    if not session:
        raise HTTPException(status_code=404, detail="Conversa não encontrada")
    prev = await db.chat_messages.find({"session_id": sid, "user_id": user.id}).sort("created_at", -1).to_list(20)
    history = [{"role": m["role"], "content": m["content"]} for m in reversed(prev)]
    text = body.text.strip()
    await db.chat_messages.insert_one(ChatMessage(session_id=sid, user_id=user.id, role="user", content=text).to_mongo())
    upd = {"updated_at": now_iso()}
    if session.title == "Nova conversa":
        upd["title"] = text[:60]
    await db.chat_sessions.update_one({"_id": oid(sid)}, {"$set": upd})
    system = ai.TUTOR_SYSTEM + f" O aluno se chama {user.name} e está no nível '{user.grade}'."

    async def gen():
        full = []
        try:
            async for chunk in ai.stream_text(system, text, history):
                full.append(chunk)
                yield chunk
        finally:
            if full:
                await db.chat_messages.insert_one(ChatMessage(session_id=sid, user_id=user.id, role="assistant",
                                                              content="".join(full)).to_mongo())

    return ai.sse_response(gen())


# ---------- ferramentas IA ----------
@api.post("/ai/learn")
async def ai_learn(body: LearnIn, user: User = Depends(get_current_user)):
    prompt = (f"Explique o assunto '{body.topic}' para um estudante do nível '{body.grade}'. Estrutura: "
              "## Em uma frase, ## Explicação (curta e clara), ## Exemplo resolvido, ## Pegadinhas comuns, "
              "## Mini exercício (2 questões curtas) e, por último, ## Gabarito comentado.")
    return ai.sse_response(ai.stream_text(ai.TUTOR_SYSTEM, prompt))


MATERIAL_MODES = {
    "resumo": "Faça um resumo organizado em tópicos, com os conceitos-chave em negrito e um parágrafo final 'O que mais cai'.",
    "revisao": "Crie flashcards de revisão no formato **Pergunta** → resposta curta (10 a 15 cartões), cobrindo o essencial.",
    "desafio": "Crie um desafio com 5 questões de múltipla escolha (A–D) sobre o material e, ao final, um gabarito comentado.",
    "mapa": "Monte um mapa mental em lista aninhada (Markdown), do tema central até os detalhes.",
}


@api.post("/ai/material")
async def ai_material(body: MaterialIn, user: User = Depends(get_current_user)):
    instr = MATERIAL_MODES.get(body.mode, MATERIAL_MODES["resumo"])
    prompt = f"{instr}\nAdapte ao nível '{user.grade}'. Use só o conteúdo do material abaixo.\n\n---\n{body.text}\n---"
    return ai.sse_response(ai.stream_text(ai.TUTOR_SYSTEM, prompt))


MAX_UPLOAD = 10 * 1024 * 1024
IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def pdf_text(data: bytes) -> tuple[str, int]:
    try:
        reader = PdfReader(io.BytesIO(data))
        pages = reader.pages[:40]
        text = "\n\n".join((p.extract_text() or "").strip() for p in pages)
    except (PdfReadError, ValueError, KeyError) as e:
        raise HTTPException(status_code=400, detail="Não consegui ler este PDF. Ele pode estar protegido ou corrompido.") from e
    return text.strip(), len(reader.pages)


@api.post("/ai/extract")
async def ai_extract(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    data = await file.read()
    if len(data) > MAX_UPLOAD:
        raise HTTPException(status_code=413, detail="Arquivo maior que 10 MB.")
    name = (file.filename or "").lower()
    ctype = file.content_type or ""
    if ctype == "application/pdf" or name.endswith(".pdf"):
        text, pages = pdf_text(data)
        if len(text) < 20:
            raise HTTPException(status_code=422, detail="Este PDF parece ser escaneado (só imagem). Tire fotos das páginas e envie como foto.")
        return {"text": text[:30000], "kind": "pdf", "pages": pages, "truncated": len(text) > 30000 or pages > 40}
    if ctype in IMAGE_TYPES or name.endswith((".jpg", ".jpeg", ".png", ".webp")):
        try:
            text = (await ai.complete("Você transcreve materiais de estudo.", ai.OCR_PROMPT,
                                      images=[base64.b64encode(data).decode()])).strip()
        except Exception as e:
            logger.exception("image transcription failed")
            raise HTTPException(status_code=502, detail="A IA não conseguiu ler a foto agora. Tente de novo.") from e
        if not text or text == "SEM_TEXTO":
            raise HTTPException(status_code=422, detail="Não encontrei texto legível na foto. Tente uma foto mais nítida e reta.")
        return {"text": text[:30000], "kind": "image", "pages": 1, "truncated": len(text) > 30000}
    if name.endswith((".txt", ".md")) or ctype.startswith("text/"):
        return {"text": data.decode("utf-8", errors="ignore")[:30000], "kind": "text", "pages": 1, "truncated": len(data) > 30000}
    raise HTTPException(status_code=415, detail="Formato não suportado. Envie PDF, foto (JPG, PNG, WEBP) ou .txt.")


@api.post("/ai/questions")
async def ai_questions(body: GenerateIn, user: User = Depends(get_current_user)):
    try:
        text = await ai.complete(ai.QUESTION_SYSTEM, ai.question_prompt(body.subj, body.topic, body.grade, body.level, body.n))
    except Exception as e:
        logger.exception("question generation failed")
        raise HTTPException(status_code=502, detail="A IA não respondeu agora. Tente de novo.") from e
    parsed = ai.parse_questions(text)
    if not parsed:
        raise HTTPException(status_code=502, detail="Não consegui gerar questões válidas. Tente de novo.")
    docs = [Question(subj=body.subj.strip(), grade=body.grade, topic=p["topic"] or body.topic or body.subj,
                     level=body.level, prompt=p["prompt"], opts=p["opts"], ans=p["ans"], err=p["err"],
                     hint=p["hint"] or "Releia o enunciado.", why=p["why"], source="ai", owner_id=user.id)
            for p in parsed]
    res = await db.questions.insert_many([d.to_mongo() for d in docs])
    for d, i in zip(docs, res.inserted_ids):
        d.id = str(i)
    return [mix(d) for d in docs]


# ---------- plano de estudos ----------
@api.get("/plan")
async def get_plan(user: User = Depends(get_current_user)):
    p = StudyPlan.from_mongo(await db.study_plans.find_one({"user_id": user.id}))
    return {"plan": p.model_dump() if p else None, "today": today_key()}


@api.post("/plan")
async def create_plan(body: PlanIn, user: User = Depends(get_current_user)):
    start = datetime.now(TZ).date()
    if body.exam_date <= start:
        raise HTTPException(status_code=400, detail="A data da prova precisa ser no futuro")
    weekdays = sorted({w for w in body.weekdays if 0 <= w <= 6})
    topics = defaultdict(list)
    async for q in db.questions.find({**visible_filter(user), "subj": {"$in": body.subjects}}, {"subj": 1, "topic": 1}):
        if q["topic"] not in topics[q["subj"]]:
            topics[q["subj"]].append(q["topic"])
    for s in body.subjects:
        for t in DEFAULT_TOPICS.get(s, []):
            if t not in topics[s]:
                topics[s].append(t)
    days = build_days(body.subjects, topics, start, body.exam_date, body.minutes_per_day, weekdays)
    plan = StudyPlan(user_id=user.id, exam_name=body.exam_name.strip(), exam_date=body.exam_date.isoformat(),
                     subjects=body.subjects, minutes_per_day=body.minutes_per_day, weekdays=weekdays, days=days)
    await db.study_plans.delete_many({"user_id": user.id})
    res = await db.study_plans.insert_one(plan.to_mongo())
    plan.id = str(res.inserted_id)
    return {"plan": plan.model_dump(), "today": today_key()}


@api.patch("/plan/tasks/{task_id}")
async def toggle_task(task_id: str, body: TaskIn, user: User = Depends(get_current_user)):
    res = await db.study_plans.update_one({"user_id": user.id}, {"$set": {"days.$[].tasks.$[t].done": body.done}},
                                          array_filters=[{"t.id": task_id}])
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    return {"ok": True}


@api.delete("/plan")
async def delete_plan(user: User = Depends(get_current_user)):
    await db.study_plans.delete_many({"user_id": user.id})
    return {"ok": True}


@api.get("/")
async def root():
    return {"message": "Inimigo das Provas API"}


app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ["CORS_ORIGINS"].split(","),
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.attempts.create_index([("user_id", 1), ("created_at", 1)])
    await db.questions.create_index("owner_id")
    await db.chat_messages.create_index([("session_id", 1), ("created_at", 1)])
    await db.study_plans.create_index("user_id")
    email, pw = os.environ["ADMIN_EMAIL"].lower(), os.environ["ADMIN_PASSWORD"]
    existing = User.from_mongo(await db.users.find_one({"email": email}))
    if not existing:
        await db.users.insert_one(User(email=email, name="Admin", role="admin", password_hash=hash_password(pw)).to_mongo())
    elif not verify_password(pw, existing.password_hash):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(pw)}})
    seeds = json.loads((ROOT_DIR / "seed_questions.json").read_text(encoding="utf-8"))
    for s in seeds:
        if not await db.questions.find_one({"seed_key": s["seed_key"]}):
            await db.questions.insert_one(Question(**s, source="base").to_mongo())


@app.on_event("shutdown")
async def shutdown():
    client.close()
