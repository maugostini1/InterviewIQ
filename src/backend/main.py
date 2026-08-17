# AI Assistance Disclosure:
# OpenAI ChatGPT was used to assist with code debugging and refinement.
# All suggestions were reviewed, tested and modified by myself.
# Citation in this document will include the AI Assistance comment for clarity of assistance.
# Debugging includes all exception handling for HTTP and JWT situations.

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

# constants for connections to FastAPI and ollama model.
app = FastAPI(title="InterviewIQ API", version="1.0.0")
OLLAMA_URL = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "gemma3:latest"

# below are AI assisted coding to help with password hashing, jwt authentication, and middleware connectivity. 
# the middleware section helps with connecting FastAPI to React.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

password_hasher = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)

# secret key used to sign and verify JWT access tokens.
JWT_SECRET = os.getenv("INTERVIEWIQ_JWT_SECRET", "change-this-development-secret")
JWT_ALGORITHM = "HS256"
TOKEN_LIFETIME = timedelta(days=7)

# class defintions below suppor the database structure that is developed in schema.sql and database.py.
# they ensure that data represents similarities to avoid confusion between database and main.py.
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

class UpdateTargetJobRequest(BaseModel):
    target_job: str = Field(
        min_length=1,
        max_length=120
    )

# for Gemma3 Model. Utilized docs.ollama.com to help with building the model.
class StartInterviewRequest(BaseModel):
    target_job: str = Field(min_length=1, max_length=120)


class InterviewQuestionResponse(BaseModel):
    question_id: int
    question_order: int
    question: str
    question_type: str

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

class CancelInterviewResponse(BaseModel):
    session_id: int
    status: str

class OverallInterviewFeedback(BaseModel):
    overall_feedback: str
    overall_strengths: list[str]
    overall_improvements: list[str]

gemma_client = httpx.AsyncClient(
    timeout=180.0
)

#Assisted from chatgpt to help with LLM response time during interview session start up.
@app.on_event("startup")
async def preload_gemma():
    try:
        await gemma_client.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "messages": [],
                "stream": False,
                "keep_alive": "30m",
            },
        )

        print("Gemma 3 preloaded.")

    except Exception as error:
        print(
            "Unable to preload Gemma:",
            error,
        )

# AI assisted:
# cleans up string values before storing. Also handles all whitespace.
def normalize_optional(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None

# AI assisted: Debugged connectivity between database and FastAPI. User information was not pulling correctly.
# converts information retrieved from database to a model used by FastAPI.
# Allows mapping for database fields to frontend styled variables.
def serialize_user(user: dict) -> UserResponse:
    return UserResponse(
        user_id=user["user_id"],
        first_name=user["f_name"],
        last_name=user["l_name"],
        email=user["email"],
        career_field=user.get("career_field"),
        target_job=user.get("target_job"),
    )

# creates user token for application access across frontend and backend.
def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + TOKEN_LIFETIME,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# obtains current user based on information collected from frontend.
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

    # calls the interviewIQDB to pull current user information.
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

# pulls profile information based on User Serialization.
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
    )

# allows the profile page's target job field to be editable in order to change LLMs interview questions.
@app.patch("/profile/target-job")
def update_target_job(
    request: UpdateTargetJobRequest,
    current_user: UserResponse = Depends(get_current_user),
):
    target_job = request.target_job.strip()

    if not target_job:
        raise HTTPException(
            status_code=400,
            detail="Target job cannot be empty.",
        )

    with InterviewIQDB("interviewiq.db") as db:
        cursor = db.conn.cursor()

        profile = db.get_profile_by_user(
            current_user.user_id
        )

        if profile is None:
            raise HTTPException(
                status_code=404,
                detail="Profile not found.",
            )

        cursor.execute(
            """
            UPDATE Profile
            SET target_job = ?
            WHERE user_id = ?
            """,
            (
                target_job,
                current_user.user_id,
            ),
        )

        db.conn.commit()

    return {
        "message": "Target job updated successfully.",
        "target_job": target_job,
    }

# AI Assisted: Struggled with Gemma Loading issues. ChatGPT suggested a pre-emptive call
# to avoid loading issues beforehand.
# calls Gemma to avoid load issues.
async def _call_gemma_once(
    messages: list[dict[str, str]],
    response_schema: dict,
    num_predict: int = 512,
) -> dict:

    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "format": response_schema,
        "keep_alive": "30m",
        "options": {
            "temperature": 0.0,
            "num_predict": num_predict,
        },
    }

    response = await gemma_client.post(
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

    print("\nRAW GEMMA CONTENT:")
    print(content)

    if not content:
        raise HTTPException(
            status_code=502,
            detail="Gemma 3 returned an empty response.",
        )

    # Strip markdown fences if Gemma ignored instructions.
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
        print("JSON PARSE ERROR:", repr(error))
        raise HTTPException(
            status_code=502,
            detail="Gemma 3 returned malformed JSON.",
        ) from error

    if not isinstance(parsed, dict):
        raise HTTPException(
            status_code=502,
            detail="Gemma 3 returned the wrong JSON structure.",
        )

    return parsed

# Explicit call to Gemma model to load.
async def call_gemma(
    messages: list[dict[str, str]],
    response_schema: dict,
    num_predict: int = 512,
) -> dict:

    last_error = None

    for attempt in range(2):
        try:
            return await _call_gemma_once(
                messages,
                response_schema,
                num_predict,
            )

        except HTTPException as error:
            last_error = error

            if error.status_code in (503, 504):
                raise

            if attempt == 0:
                print(
                    "Gemma response invalid. Retrying..."
                )

    raise last_error or HTTPException(
        status_code=502,
        detail="Gemma failed to return valid JSON.",
    )

# Gemma schema used to handle feedback generation.
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

    # stores all information generated by Gemma into a collect text format.
    for index, item in enumerate(
        questions_and_answers,
        start=1,
    ):
        interview_text += (
            f"\nQuestion {index}:\n"
            f"{item['question_text']}\n\n"
            f"Question Type: {item['question_type']}\n\n"
            f"Candidate Answer:\n"
            f"{item['response']}\n\n"
            f"STAR Score: {item['total_score']}/100\n"
            f"Situation: {item['situation_score']}/25\n"
            f"Task: {item['task_score']}/25\n"
            f"Action: {item['action_score']}/25\n"
            f"Result: {item['results_score']}/25\n"
        )

    # Gemma call to review interview answers and provide overall feedback.
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
# Question Schema is built to ask strictly five questions.
# Each question is broken down into a type listed in the 'enum' section.
# Question types used because they are the most STAR appropriate method.
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
                        "type": "object",
                        "properties": {
                            "question": {
                                "type": "string"
                            },
                            "question_type": {
                                "type": "string",
                                "enum": [
                                    "scenario",
                                    "behavioral",
                                    "behavioral",
                                    "communication",
                                    "communication"
                                ]
                            }
                        },
                        "required": [
                            "question",
                            "question_type"
                        ]
                    }
                }
            },
            "required": [
                "questions"
            ]
        }

        # break down of how Gemma is built to handle the interview and ratings per question answered.
        result = await call_gemma(
            messages=[
                {
                    "role": "system",
                    "content": ("""
                        You are a professional interviewer.

                        Generate exactly five distinct interview questions specifically
                        tailored to the candidate's target job.

                        Create a realistic mixture of question types appropriate for the role.

                        Use these categories in order:

                        1. PROBLEM SOLVING / SCENARIO
                        Present a realistic situation or problem someone in the target job
                        could encounter and ask how the candidate would approach it.

                        2. BEHAVIORAL
                        Ask about a relevant past experience that can be answered using the
                        STAR method.

                        3. BEHAVIORAL
                        Ask about a relevant past experience that can be answered using the
                        STAR method.

                        4. COMMUNICATION / COLLABORATION
                        Evaluate the candidate's ability to communicate, collaborate, explain
                        ideas, handle disagreements, or work with stakeholders in the context
                        of the target job.

                        5. COMMUNICATION / COLLABORATION
                        Evaluate the candidate's ability to communicate, collaborate, explain
                        ideas, handle disagreements, or work with stakeholders in the context
                        of the target job.

                        IMPORTANT:

                        Questions must be specifically relevant to the target job.

                        Do not generate five generic behavioral questions.

                        Do not repeat the same competency or scenario.

                        Technical difficulty should be appropriate for the target job.

                        Do not provide answers.

                        Do not provide explanations.

                        Return only JSON matching the supplied schema.
                        """
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Target job: {request.target_job}\n\n"
                        "Generate exactly five interview questions using the required "
                        "question types."
                    ),
                },
            ],
            response_schema=question_schema,
            num_predict=500,
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
                    "mixed",
                    request.target_job,
                    "active",
                    OLLAMA_MODEL,
                ),
            )

            session_id = cursor.lastrowid
            stored_questions = []

            # stores information into database.
            for question_order, item in enumerate(
                generated_questions,
                start=1,
            ):
                question_text = item["question"]
                question_type = item["question_type"]
                
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
                        question_type,
                        question_order,
                    ),
                )

                stored_questions.append(
                    InterviewQuestionResponse(
                        question_id=cursor.lastrowid,
                        question_order=question_order,
                        question=question_text.strip(),
                        question_type=question_type,
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

# Completion of interview where the information saved to database based on the sessionID
# are utilized to generate a well presented page of guidance and praise for STAR answers.
# Calculates average score of entire interview and sets the sessionID to complete.
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
                q.question_type,
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

# Cancels the session when end interview is pressed. This saves the sessionID
# however, the sessionID will be flagged as cancelled.
@app.post(
    "/interviews/{session_id}/cancel",
    response_model=CancelInterviewResponse,
)
def cancel_interview(
    session_id: int,
    current_user: UserResponse = Depends(get_current_user),
):
    with InterviewIQDB("interviewiq.db") as db:
        cursor = db.conn.cursor()

        interview = cursor.execute(
            """
            SELECT session_id, status
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

        if interview["status"] == "completed":
            raise HTTPException(
                status_code=400,
                detail="A completed interview cannot be cancelled.",
            )

        cursor.execute(
            """
            UPDATE Interview
            SET status = 'cancelled',
                session_end_time = datetime('now')
            WHERE session_id = ?
              AND user_id = ?
            """,
            (
                session_id,
                current_user.user_id,
            ),
        )

        db.conn.commit()

    return CancelInterviewResponse(
        session_id=session_id,
        status="cancelled",
    )

# Allows Gemma to rate each criteria of the STAR method. 
# Each score is between 0 and 25 where the max score is 100.
# After rating is completed by Gemma information is stored in database
# to be pulled when feedback page is populated with sessionID.
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
            SELECT q.question_text, q.question_type
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
    question_type = question_row["question_type"]

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
            {"role": "system",
            "content": """
                You are an objective professional interview coach.

                Evaluate the candidate's response to the behavioral interview
                question using the STAR method.

                Score each STAR category from 0 through 25:

                Situation:
                Evaluate how clearly the candidate explains the context,
                background, or circumstances.

                Task:
                Evaluate how clearly the candidate explains their specific
                responsibility, objective, or challenge.

                Action:
                Evaluate how clearly the candidate explains the important actions
                they personally took. Give credit for meaningful problem solving,
                decision making, communication, collaboration, leadership, or
                technical work even if every individual step is not described.

                Result:
                Evaluate how clearly the candidate explains the outcome, impact,
                what happened because of their actions, or what they learned.

                A measurable result is helpful but is not required for a strong score.

                Scoring guidance:

                0-5:
                The STAR component is mostly missing or unclear.

                6-12:
                The component is present but vague or lacks important details.

                13-19:
                The component is clear and relevant but could be more specific.

                20-25:
                The component is detailed, specific, relevant, and compelling.

                Do not invent information that the candidate did not provide.

                Do not reward details that are not present in the answer.

                Provide:
                - specific strengths
                - specific areas for improvement
                - concise overall feedback
                - a stronger suggested answer that preserves the candidate's facts

                Return only a JSON object matching the supplied schema.

                Do not use markdown.
                Do not use code fences.
                Do not write any explanation before or after the JSON.
                Do not rename fields.
                Do not omit required fields.
                """,
                        },
                        {
                            "role": "user",
                            "content": (
                                f"Interview Question:\n"
                                f"{question_text}\n\n"
                                f"Candidate Answer:\n"
                                f"{request.answer}"
                            ),
                        },
                    ],
                response_schema=feedback_schema,
                num_predict=400,
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

# Interview history is pulled to support home page graph and average score
# for progress tracking.
@app.get("/interviews/history")
def get_interview_history(
    current_user: UserResponse = Depends(get_current_user),
):
    with InterviewIQDB("interviewiq.db") as db:
        cursor = db.conn.cursor()

        rows = cursor.execute(
            """
            SELECT
                session_id,
                target_job,
                session_start_time,
                session_end_time,
                score,
                status
            FROM Interview
            WHERE user_id = ?
              AND status = 'completed'
            ORDER BY session_end_time ASC
            """,
            (current_user.user_id,),
        ).fetchall()

    interviews = [
        dict(row)
        for row in rows
    ]

    scores = [
        float(interview["score"])
        for interview in interviews
        if interview["score"] is not None
    ]

    average_score = (
        round(sum(scores) / len(scores), 1)
        if scores
        else 0
    )

    return {
        "total_interviews": len(interviews),
        "average_score": average_score,
        "interviews": interviews,
    }

# Last section pulls the information to generate the feedback page that was posted
# by Gemma during interview. 
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

    # loop presents each item in the dictionary for strengths and improvements.
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

    return {
        "interview": interview_data,
        "questions": questions,
    }
