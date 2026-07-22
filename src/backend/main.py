import os
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

import jwt
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from pwdlib import PasswordHash

from .database import InterviewIQDB

app = FastAPI(title="InterviewIQ API", version="1.0.0")

# For local development this permits Expo web and native development clients.
# Replace with your deployed frontend origins before production.
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
        Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)
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

    with InterviewIQDB() as db:
        user = db.get_user_with_profile(user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account no longer exists.",
        )

    return serialize_user(user)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


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