import os
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional
from pathlib import Path
from uuid import uuid4
import json
import httpx
import jwt
from fastapi import Depends, FastAPI, HTTPException, status, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from pwdlib import PasswordHash
import traceback
from database import InterviewIQDB

app = FastAPI(title="InterviewIQ API", version="1.0.0")
OLLAMA_URL = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "gemma3"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

password_hasher = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)
JWT_SECRET = os.getenv("INTERVIEWIQ_JWT_SECRET", "change-this-development-secret")
JWT_ALGORITHM = "HS256"
TOKEN_LIFETIME = timedelta(days=7)


class SignupRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    career_field: Optional[str] = Field(default=None, max_length=120)
    target_job: Optional[str] = Field(default=None, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    email: EmailStr
    career_field: Optional[str] = None
    target_job: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ProfileResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    email: EmailStr
    career_field: Optional[str] = None
    target_job: Optional[str] = None
    resume_filename: Optional[str] = None

def normalize_optional(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def serialize_user(user: dict) -> UserResponse:
    return UserResponse(
        user_id=user["user_id"],
        first_name=user["f_name"],
        last_name=user["l_name"],
        email=user["email"],
        career_field=user.get("career_field"),
        target_job=user.get("target_job"),
    )


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + TOKEN_LIFETIME,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: Annotated[
        Optional[HTTPAuthorizationCredentials],
        Depends(bearer_scheme),
    ],
) -> UserResponse:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
        )

        user_id = int(payload["sub"])

    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        ) from error

    with InterviewIQDB("interviewiq.db") as db:
        user = db.get_user(user_id)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account no longer exists.",
            )

        profile = db.get_profile_by_user(user_id)

        user_data = {
            **user,
            "career_field": (
                profile["career_field"] if profile else None
            ),
            "target_job": (
                profile["target_job"] if profile else None
            ),
        }

    return serialize_user(user_data)

# used ChatGPT to help as I was encountering a problem with the @app.post function (internal server issues)
@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}

# stores signup information
@app.post("/auth/signup", status_code=201)
def signup(request: SignupRequest):
    email = request.email.strip().lower()

    try:
        with InterviewIQDB("interviewiq.db") as db:
            existing_user = db.get_user_by_email(email)

            if existing_user:
                raise HTTPException(
                    status_code=409,
                    detail="An account already exists with this email.",
                )

            password_hash = password_hasher.hash(request.password)

            user_id = db.create_user(
                f_name=request.first_name.strip(),
                l_name=request.last_name.strip(),
                password_hash=password_hash,
                email=email,
            )

            db.create_profile(
                user_id=user_id,
                career_field=request.career_field.strip()
                if request.career_field
                else None,
                target_job=request.target_job.strip()
                if request.target_job
                else None,
            )

            user = db.get_user(user_id)

        access_token = create_access_token(user_id)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "user_id": user["user_id"],
                "first_name": user["f_name"],
                "last_name": user["l_name"],
                "email": user["email"],
            },
        }

    except HTTPException:
        raise

    except Exception as error:
        print("SIGNUP ERROR:", repr(error))

        raise HTTPException(
            status_code=500,
            detail=f"{type(error).__name__}: {error}",
)

# Handles login requests
@app.post("/auth/login", response_model=AuthResponse)
def login(request: LoginRequest) -> AuthResponse:
    email = request.email.strip().lower()

    try:
        with InterviewIQDB("interviewiq.db") as db:
            stored_user = db.get_user_by_email(email)

            if stored_user is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="The email or password is incorrect.",
                )

            if not password_hasher.verify(
                request.password,
                stored_user["password_hash"],
            ):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="The email or password is incorrect.",
                )

            profile = db.get_profile_by_user(stored_user["user_id"])

        user_data = {
            **stored_user,
            "career_field": profile["career_field"] if profile else None,
            "target_job": profile["target_job"] if profile else None,
        }

        return AuthResponse(
            access_token=create_access_token(stored_user["user_id"]),
            user=serialize_user(user_data),
        )

    except HTTPException:
        raise

    except Exception as error:
        print("LOGIN ERROR:", repr(error))

        raise HTTPException(
            status_code=500,
            detail=f"{type(error).__name__}: {error}",
        ) from error

# For Resume Uploader
UPLOAD_DIRECTORY = Path(__file__).resolve().parent / "uploads" / "resumes"
UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)

ALLOWED_RESUME_TYPES = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}

MAX_RESUME_SIZE = 5 * 1024 * 1024

@app.post("/resume/upload")
async def upload_resume(
    resume: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user),
):
    if resume.content_type not in ALLOWED_RESUME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF, DOC, and DOCX resumes are allowed.",
        )

    contents = await resume.read()

    if len(contents) > MAX_RESUME_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="The resume must be 5 MB or smaller.",
        )

    extension = ALLOWED_RESUME_TYPES[resume.content_type]

    stored_filename = (
        f"user_{current_user.user_id}_{uuid4().hex}{extension}"
    )

    destination = UPLOAD_DIRECTORY / stored_filename

    destination.write_bytes(contents)

    with InterviewIQDB("interviewiq.db") as db:
        profile = db.get_profile_by_user(current_user.user_id)

        if profile is None:
            raise HTTPException(
                status_code=404,
                detail="Profile was not found.",
            )

        # Remove the user's previous stored resume when replacing it.
        previous_path = profile.get("resume_path")

        if previous_path:
            previous_file = Path(previous_path)

            if previous_file.exists():
                try:
                    previous_file.unlink()
                except OSError:
                    # Do not fail the new upload just because cleanup failed.
                    pass

        db.update_profile(
            profile["profile_id"],
            resume_path=str(destination),
            resume_filename=resume.filename,
        )

    return {
        "message": "Your resume was uploaded successfully.",
        "filename": resume.filename,
        "stored_filename": stored_filename,
        }

@app.get("/profile", response_model=ProfileResponse)
def get_profile(
    current_user: UserResponse = Depends(get_current_user),
):
    with InterviewIQDB("interviewiq.db") as db:
        profile = db.get_profile_by_user(current_user.user_id)

    return ProfileResponse(
        user_id=current_user.user_id,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        email=current_user.email,
        career_field=current_user.career_field,
        target_job=current_user.target_job,
        resume_filename=(
            profile["resume_filename"]
            if profile
            else None
        ),
    )

# for Gemma3 Model. Utilized docs.ollama.com to help with building the model.
class StartInterviewRequest(BaseModel):
    target_job: str = Field(min_length=1, max_length=120)


class StartInterviewResponse(BaseModel):
    session_id: int
    question_id: int
    question: str


class SubmitAnswerRequest(BaseModel):
    session_id: int
    question_id: int
    answer: str = Field(min_length=1)


class StarScores(BaseModel):
    situation: int = Field(ge=0, le=25)
    task: int = Field(ge=0, le=25)
    action: int = Field(ge=0, le=25)
    result: int = Field(ge=0, le=25)


class AnswerFeedbackResponse(BaseModel):
    answer_id: int
    total_score: int
    scores: StarScores
    strengths: list[str]
    improvements: list[str]
    feedback: str
    suggested_answer: str

async def call_gemma(
    messages: list[dict[str, str]],
    response_schema: dict,
) -> dict:
    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "format": response_schema,
        "options": {
            "temperature": 0.3,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(OLLAMA_URL, json=payload)
            response.raise_for_status()

        ollama_response = response.json()
        content = ollama_response["message"]["content"]

        return json.loads(content)

    except httpx.ConnectError as error:
        raise HTTPException(
            status_code=503,
            detail=(
                "Could not connect to Gemma 3. "
                "Make sure Ollama is running."
            ),
        ) from error

    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502,
            detail=f"Gemma 3 request failed: {error}",
        ) from error

    except (KeyError, json.JSONDecodeError) as error:
        raise HTTPException(
            status_code=502,
            detail="Gemma 3 returned an invalid response.",
        ) from error
    
#interview questions
@app.post(
    "/interviews/start",
    response_model=StartInterviewResponse,
)
async def start_interview(
    request: StartInterviewRequest,
    current_user: UserResponse = Depends(get_current_user),
):
    try:
        print("1. Starting interview")
        print("User:", current_user.user_id)
        print("Target job:", request.target_job)

        question_schema = {
            "type": "object",
            "properties": {
                "question": {"type": "string"},
            },
            "required": ["question"],
        }

        print("2. Calling Gemma")

        result = await call_gemma(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a professional behavioral interviewer. "
                        "Generate exactly one realistic behavioral interview "
                        "question that encourages a STAR-method answer."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Target job: {request.target_job}\n"
                        "Generate one behavioral interview question."
                    ),
                },
            ],
            response_schema=question_schema,
        )

        print("3. Gemma result:", result)

        question_text = result["question"]

        print("4. Opening database")

        with InterviewIQDB("interviewiq.db") as db:
            cursor = db.conn.cursor()

            print("5. Inserting interview")

            cursor.execute(
                """
                INSERT INTO Interview (
                    user_id,
                    session_start_time,
                    interview_type,
                    target_job,
                    status,
                    model_name
                )
                VALUES (?, datetime('now'), ?, ?, ?, ?)
                """,
                (
                    current_user.user_id,
                    "behavioral",
                    request.target_job,
                    "active",
                    OLLAMA_MODEL,
                ),
            )

            session_id = cursor.lastrowid

            print("6. Inserting question")

            cursor.execute(
                """
                INSERT INTO Question (
                    session_id,
                    question_text,
                    question_type,
                    question_order
                )
                VALUES (?, ?, ?, ?)
                """,
                (
                    session_id,
                    question_text,
                    "behavioral",
                    1,
                ),
            )

            question_id = cursor.lastrowid
            db.conn.commit()

        print("7. Interview created successfully")

        return StartInterviewResponse(
            session_id=session_id,
            question_id=question_id,
            question=question_text,
        )

    except HTTPException:
        raise

    except Exception as error:
        print("START INTERVIEW ERROR:", repr(error))
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f"{type(error).__name__}: {error}",
        ) from error

    return StartInterviewResponse(
        session_id=session_id,
        question_id=question_id,
        question=question_text,
    )

@app.post(
    "/interviews/answer",
    response_model=AnswerFeedbackResponse,
)
async def submit_interview_answer(
    request: SubmitAnswerRequest,
    current_user: UserResponse = Depends(get_current_user),
):
    with InterviewIQDB("interviewiq.db") as db:
        cursor = db.conn.cursor()

        question_row = cursor.execute(
            """
            SELECT q.question_text
            FROM Question q
            JOIN Interview i
              ON i.session_id = q.session_id
            WHERE q.question_id = ?
              AND q.session_id = ?
              AND i.user_id = ?
            """,
            (
                request.question_id,
                request.session_id,
                current_user.user_id,
            ),
        ).fetchone()

    if question_row is None:
        raise HTTPException(
            status_code=404,
            detail="Interview question not found.",
        )

    question_text = question_row["question_text"]

    feedback_schema = {
        "type": "object",
        "properties": {
            "scores": {
                "type": "object",
                "properties": {
                    "situation": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 25,
                    },
                    "task": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 25,
                    },
                    "action": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 25,
                    },
                    "result": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 25,
                    },
                },
                "required": [
                    "situation",
                    "task",
                    "action",
                    "result",
                ],
            },
            "strengths": {
                "type": "array",
                "items": {"type": "string"},
            },
            "improvements": {
                "type": "array",
                "items": {"type": "string"},
            },
            "feedback": {"type": "string"},
            "suggested_answer": {"type": "string"},
        },
        "required": [
            "scores",
            "strengths",
            "improvements",
            "feedback",
            "suggested_answer",
        ],
    }

    evaluation = await call_gemma(
        messages=[
            {
                "role": "system",
                "content": """
                You are an objective interview coach.

                Evaluate the candidate's answer using the STAR method.

                Score each category from 0 through 25:

                Situation:
                How clearly the candidate explains the relevant background.

                Task:
                How clearly the candidate explains their responsibility or goal.

                Action:
                How specifically the candidate explains the actions they personally took.

                Result:
                How clearly the candidate explains the outcome, impact, or lesson.

                Do not assume facts that the candidate did not provide.
                Do not reward invented details.
                Provide constructive and specific feedback.
                The suggested answer must preserve the candidate's facts.
                """,
            },
            {
                "role": "user",
                "content": (
                    f"Question:\n{question_text}\n\n"
                    f"Candidate answer:\n{request.answer}"
                ),
            },
        ],
        response_schema=feedback_schema,
    )

    scores = evaluation["scores"]

    total_score = (
        scores["situation"]
        + scores["task"]
        + scores["action"]
        + scores["result"]
    )

    with InterviewIQDB("interviewiq.db") as db:
        cursor = db.conn.cursor()

        cursor.execute(
            """
            INSERT INTO Answer (
                question_id,
                session_id,
                user_id,
                response,
                situation_score,
                task_score,
                action_score,
                results_score,
                total_score
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                request.question_id,
                request.session_id,
                current_user.user_id,
                request.answer,
                scores["situation"],
                scores["task"],
                scores["action"],
                scores["result"],
                total_score,
            ),
        )

        answer_id = cursor.lastrowid

        cursor.execute(
            """
            INSERT INTO Feedback (
                answer_id,
                star_score,
                feedback_text,
                strengths,
                improvements,
                suggested_answer,
                model_name,
                raw_model_response
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                answer_id,
                total_score,
                evaluation["feedback"],
                json.dumps(evaluation["strengths"]),
                json.dumps(evaluation["improvements"]),
                evaluation["suggested_answer"],
                OLLAMA_MODEL,
                json.dumps(evaluation),
            ),
        )

        db.conn.commit()

    return AnswerFeedbackResponse(
        answer_id=answer_id,
        total_score=total_score,
        scores=StarScores(**scores),
        strengths=evaluation["strengths"],
        improvements=evaluation["improvements"],
        feedback=evaluation["feedback"],
        suggested_answer=evaluation["suggested_answer"],
    )