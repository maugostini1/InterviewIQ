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
from pydantic import BaseModel, EmailStr, Field, ValidationError
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

# for Gemma3 Model. Utilized docs.ollama.com to help with building the model.
class StartInterviewRequest(BaseModel):
    target_job: str = Field(min_length=1, max_length=120)


class InterviewQuestionResponse(BaseModel):
    question_id: int
    question_order: int
    question: str

class StartInterviewResponse(BaseModel):
    session_id: int
    questions: list[InterviewQuestionResponse]


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

class CompleteInterviewResponse(BaseModel):
    session_id: int
    status: str
    average_score: float

class OverallInterviewFeedback(BaseModel):
    overall_feedback: str
    overall_strengths: list[str]
    overall_improvements: list[str]

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
            "temperature": 0.1,
        },
    }

    async with httpx.AsyncClient(timeout=180.0) as client:
        response = await client.post(
            OLLAMA_URL,
            json=payload,
        )

        response.raise_for_status()

        ollama_response = response.json()

        content = (
            ollama_response
            .get("message", {})
            .get("content", "")
            .strip()
        )

        print("RAW GEMMA CONTENT:")
        print(content)

        # Remove markdown fences if Gemma adds them.
        if content.startswith("```json"):
            content = content[7:]

        elif content.startswith("```"):
            content = content[3:]

        if content.endswith("```"):
            content = content[:-3]

        content = content.strip()

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as error:
        print("JSON ERROR:", repr(error))
        raise HTTPException(
            status_code=502,
            detail="Gemma 3 returned malformed JSON.",
        ) from error

    if not isinstance(parsed, dict):
        raise HTTPException(
            status_code=502,
            detail="Gemma 3 returned the wrong response structure.",
        )

    return parsed

async def generate_overall_interview_feedback(
    questions_and_answers: list[dict],
) -> dict:
    feedback_schema = {
        "type": "object",
        "properties": {
            "overall_feedback": {
                "type": "string",
            },
            "overall_strengths": {
                "type": "array",
                "items": {"type": "string"},
            },
            "overall_improvements": {
                "type": "array",
                "items": {"type": "string"},
            },
        },
        "required": [
            "overall_feedback",
            "overall_strengths",
            "overall_improvements",
        ],
    }

    interview_text = ""

    for index, item in enumerate(
        questions_and_answers,
        start=1,
    ):
        interview_text += (
            f"\nQuestion {index}:\n"
            f"{item['question_text']}\n\n"
            f"Candidate Answer:\n"
            f"{item['response']}\n\n"
            f"STAR Score: {item['total_score']}/100\n"
            f"Situation: {item['situation_score']}/25\n"
            f"Task: {item['task_score']}/25\n"
            f"Action: {item['action_score']}/25\n"
            f"Result: {item['results_score']}/25\n"
        )

    return await call_gemma(
        messages=[
            {
                "role": "system",
                "content": """
                You are a professional interview coach.

                Review the candidate's entire five-question behavioral interview.

                Identify patterns across all five STAR answers.

                Evaluate:
                - clarity of situations
                - ownership of tasks
                - specificity of actions
                - strength and measurability of results
                - consistency across answers
                - communication quality

                Provide:
                1. A concise overall assessment.
                2. The candidate's strongest recurring behaviors.
                3. The most important recurring areas for improvement.

                Do not invent facts.
                Base the evaluation only on the interview provided.
                Return only valid JSON matching the supplied schema.
                """,
            },
            {
                "role": "user",
                "content": interview_text,
            },
        ],
        response_schema=feedback_schema,
    )
    
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
        question_schema = {
            "type": "object",
            "properties": {
                "questions": {
                    "type": "array",
                    "minItems": 5,
                    "maxItems": 5,
                    "items": {
                        "type": "string",
                    },
                },
            },
            "required": ["questions"],
        }

        result = await call_gemma(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a professional behavioral interviewer. "
                        "Generate exactly five distinct behavioral interview "
                        "questions for the target job. Each question must encourage "
                        "a STAR-method response. Return only the five questions. "
                        "Do not include answers, explanations, or numbering."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Target job: {request.target_job}\n"
                        "Generate exactly five behavioral interview questions."
                    ),
                },
            ],
            response_schema=question_schema,
        )

        generated_questions = result.get("questions", [])

        if len(generated_questions) != 5:
            raise HTTPException(
                status_code=502,
                detail="Gemma 3 did not return exactly five questions.",
            )

        with InterviewIQDB("interviewiq.db") as db:
            cursor = db.conn.cursor()

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
            stored_questions = []

            for question_order, question_text in enumerate(
                generated_questions,
                start=1,
            ):
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
                        question_text.strip(),
                        "behavioral",
                        question_order,
                    ),
                )

                stored_questions.append(
                    InterviewQuestionResponse(
                        question_id=cursor.lastrowid,
                        question_order=question_order,
                        question=question_text.strip(),
                    )
                )

            db.conn.commit()

        return StartInterviewResponse(
            session_id=session_id,
            questions=stored_questions,
        )

    except HTTPException:
        raise

    except Exception as error:
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f"{type(error).__name__}: {error}",
        ) from error

@app.post(
    "/interviews/{session_id}/complete",
    response_model=CompleteInterviewResponse,
)
def complete_interview(
    session_id: int,
    current_user: UserResponse = Depends(get_current_user),
):
    with InterviewIQDB("interviewiq.db") as db:
        cursor = db.conn.cursor()

        interview = cursor.execute(
            """
            SELECT session_id
            FROM Interview
            WHERE session_id = ?
              AND user_id = ?
            """,
            (
                session_id,
                current_user.user_id,
            ),
        ).fetchone()

        if interview is None:
            raise HTTPException(
                status_code=404,
                detail="Interview session not found.",
            )

        score_row = cursor.execute(
            """
            SELECT AVG(total_score) AS average_score,
                   COUNT(*) AS answer_count
            FROM Answer
            WHERE session_id = ?
              AND user_id = ?
            """,
            (
                session_id,
                current_user.user_id,
            ),
        ).fetchone()

        if score_row["answer_count"] < 5:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Only {score_row['answer_count']} of 5 "
                    "questions have been completed."
                ),
            )

        average_score = round(
            float(score_row["average_score"] or 0),
            2,
        )

        answer_rows = cursor.execute(
            """
            SELECT
                q.question_order,
                q.question_text,
                a.response,
                a.situation_score,
                a.task_score,
                a.action_score,
                a.results_score,
                a.total_score
            FROM Question q
            JOIN Answer a
                ON a.question_id = q.question_id
            WHERE q.session_id = ?
              AND a.user_id = ?
            ORDER BY q.question_order
            """,
            (
                session_id,
                current_user.user_id,
            ),
        ).fetchall()

        interview_answers = [
            dict(row)
            for row in answer_rows
        ]


        cursor.execute(
            """
            UPDATE Interview
            SET status = 'completed',
                session_end_time = datetime('now'),
                score = ?
            WHERE session_id = ?
              AND user_id = ?
            """,
            (
                average_score,
                session_id,
                current_user.user_id,
            ),
        )

        db.conn.commit()

    return CompleteInterviewResponse(
        session_id=session_id,
        status="completed",
        average_score=average_score,
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

@app.get("/interviews/{session_id}")
def get_interview_session(
    session_id: int,
    current_user: UserResponse = Depends(get_current_user),
):
    with InterviewIQDB("interviewiq.db") as db:
        cursor = db.conn.cursor()

        interview = cursor.execute(
            """
            SELECT *
            FROM Interview
            WHERE session_id = ?
              AND user_id = ?
            """,
            (
                session_id,
                current_user.user_id,
            ),
        ).fetchone()

        if interview is None:
            raise HTTPException(
                status_code=404,
                detail="Interview session not found.",
            )

        rows = cursor.execute(
            """
            SELECT
                q.question_id,
                q.question_order,
                q.question_text,
                a.answer_id,
                a.response,
                a.situation_score,
                a.task_score,
                a.action_score,
                a.results_score,
                a.total_score,
                f.feedback_text,
                f.strengths,
                f.improvements,
                f.suggested_answer
            FROM Question q
            LEFT JOIN Answer a
                ON a.question_id = q.question_id
            LEFT JOIN Feedback f
                ON f.answer_id = a.answer_id
            WHERE q.session_id = ?
            ORDER BY q.question_order
            """,
            (session_id,),
        ).fetchall()

    questions = []

    for row in rows:
        item = dict(row)

        item["strengths"] = (
            json.loads(item["strengths"])
            if item.get("strengths")
            else []
        )

        item["improvements"] = (
            json.loads(item["improvements"])
            if item.get("improvements")
            else []
        )

        questions.append(item)

    interview_data = dict(interview)

    interview_data["overall_strengths"] = (
        json.loads(interview_data["overall_strengths"])
        if interview_data.get("overall_strengths")
        else []
    )

    interview_data["overall_improvements"] = (
        json.loads(interview_data["overall_improvements"])
        if interview_data.get("overall_improvements")
        else []
    )

    return {
        "interview": interview_data,
        "questions": questions,
    }

