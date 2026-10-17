import os
from datetime import datetime, timezone, timedelta
from typing import Annotated, Any, Optional, List
from zoneinfo import ZoneInfo

import bcrypt
import jwt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

TZ = ZoneInfo("America/Sao_Paulo")
JWT_ALGORITHM = "HS256"

PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_key() -> str:
    return datetime.now(TZ).date().isoformat()


def oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=404, detail="Não encontrado")


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")
    id: Optional[PyObjectId] = Field(default=None, validation_alias="_id")

    @classmethod
    def from_mongo(cls, doc: Optional[dict]):
        return cls.model_validate(doc) if doc else None

    def to_mongo(self) -> dict:
        data = self.model_dump()
        data.pop("id", None)
        if self.id:
            data["_id"] = ObjectId(self.id)
        return data


class User(BaseDocument):
    email: str
    name: str
    role: str = "student"
    grade: str = "ENEM"
    password_hash: str = ""
    created_at: str = Field(default_factory=now_iso)

    def public(self) -> dict:
        return {"id": self.id, "email": self.email, "name": self.name, "role": self.role, "grade": self.grade}


class Question(BaseDocument):
    seed_key: Optional[str] = None
    subj: str
    grade: str
    topic: str
    level: int = 2
    prompt: str
    opts: List[str]
    ans: int
    err: List[Optional[str]]
    hint: str = ""
    why: str = ""
    source: str = "base"
    owner_id: Optional[str] = None
    reviewed: bool = False
    created_at: str = Field(default_factory=now_iso)


class Attempt(BaseDocument):
    user_id: str
    question_id: str
    topic: str
    subj: str
    correct: bool
    err: Optional[str] = None
    xp: int = 0
    mode: str = "treino"
    day: str = Field(default_factory=today_key)
    created_at: str = Field(default_factory=now_iso)


class Simulado(BaseDocument):
    user_id: str
    subj: str
    total: int
    hits: int
    seconds: int
    created_at: str = Field(default_factory=now_iso)


class ChatSession(BaseDocument):
    user_id: str
    title: str = "Nova conversa"
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class ChatMessage(BaseDocument):
    session_id: str
    user_id: str
    role: str
    content: str
    created_at: str = Field(default_factory=now_iso)


class StudyPlan(BaseDocument):
    user_id: str
    exam_name: str
    exam_date: str
    subjects: List[str]
    minutes_per_day: int
    weekdays: List[int]
    days: List[dict[str, Any]]
    created_at: str = Field(default_factory=now_iso)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> User:
    token = request.cookies.get("access_token")
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Token inválido")
    user = User.from_mongo(await db.users.find_one({"_id": ObjectId(payload["sub"])}))
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return user


def visible_filter(user: User) -> dict:
    return {"$or": [{"owner_id": None}, {"owner_id": user.id}]}
