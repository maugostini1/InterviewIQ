import sqlite3
import os
from contextlib import contextmanager
from typing import Optional, List, Dict, Any

#connects schema of database to database python file.
SCHEMA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "schema.sql")

# class defined to handle all cursor functionality of backend to the database.
# constructor sets path and connect to sqlite server.
#
class InterviewIQDB:
    def __init__(self, db_path: str = "interviewiq.db"):
        self.db_path = db_path
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
        self._init_schema()


    # connects and disconnects database.
    def _init_schema(self):
        with open(SCHEMA_FILE, "r") as f:
            self.conn.executescript(f.read())
        self.conn.commit()

    def close(self):
        self.conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    # cursor is the pointer to each item in the database.
    @contextmanager
    def _cursor(self):
        cur = self.conn.cursor()
        try:
            yield cur
            self.conn.commit()
        except Exception:
            self.conn.rollback()
            raise
        finally:
            cur.close()

    @staticmethod
    def _row_to_dict(row: Optional[sqlite3.Row]) -> Optional[Dict[str, Any]]:
        return dict(row) if row is not None else None

    
    # definitions for user information.
    def create_user(self, f_name: str, l_name: str, password_hash: str, email: str) -> int:
        with self._cursor() as cur:
            cur.execute(
                "INSERT INTO User (f_name, l_name, password_hash, email) VALUES (?, ?, ?, ?)",
                (f_name, l_name, password_hash, email),
            )
            return cur.lastrowid

    def get_user(self, user_id: int) -> Optional[Dict[str, Any]]:
        cur = self.conn.execute("SELECT * FROM User WHERE user_id = ?", (user_id,))
        return self._row_to_dict(cur.fetchone())

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        cur = self.conn.execute("SELECT * FROM User WHERE email = ?", (email,))
        return self._row_to_dict(cur.fetchone())

    def update_user(self, user_id: int, **fields) -> None:
        self._update_row("User", "user_id", user_id, fields)

    def delete_user(self, user_id: int) -> None:
        with self._cursor() as cur:
            cur.execute("DELETE FROM User WHERE user_id = ?", (user_id,))

    
    # definitions for profile information.
    def create_profile(
        self,
        user_id: int,
        career_field: str = None,
        target_job: str = None,
        resume_path: str = None,
        resume_text: str = None,
        resume_filename: str = None,
    ) -> int:
        with self._cursor() as cur:
            cur.execute(
                """INSERT INTO Profile
                   (user_id, career_field, target_job, resume_path, resume_text, resume_filename)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (user_id, career_field, target_job, resume_path, resume_text, resume_filename),
            )
            return cur.lastrowid

    def get_profile_by_user(self, user_id: int) -> Optional[Dict[str, Any]]:
        cur = self.conn.execute("SELECT * FROM Profile WHERE user_id = ?", (user_id,))
        return self._row_to_dict(cur.fetchone())

    def update_profile(self, profile_id: int, **fields) -> None:
        self._update_row("Profile", "profile_id", profile_id, fields)

    def delete_profile(self, profile_id: int) -> None:
        with self._cursor() as cur:
            cur.execute("DELETE FROM Profile WHERE profile_id = ?", (profile_id,))

    # definitions for interview information.
    def create_interview(
        self,
        user_id: int,
        date: str = None,
        time: str = None,
        duration: int = None,
        score: float = None,
        session_start_time: str = None,
        session_end_time: str = None,
        interview_type: str = None,
    ) -> int:
        with self._cursor() as cur:
            cur.execute(
                """INSERT INTO Interview
                   (user_id, date, time, duration, score, session_start_time,
                    session_end_time, interview_type)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (user_id, date, time, duration, score, session_start_time,
                 session_end_time, interview_type),
            )
            return cur.lastrowid

    def get_interview(self, session_id: int) -> Optional[Dict[str, Any]]:
        cur = self.conn.execute("SELECT * FROM Interview WHERE session_id = ?", (session_id,))
        return self._row_to_dict(cur.fetchone())

    def get_interviews_by_user(self, user_id: int) -> List[Dict[str, Any]]:
        cur = self.conn.execute(
            "SELECT * FROM Interview WHERE user_id = ? ORDER BY session_start_time DESC",
            (user_id,),
        )
        return [dict(r) for r in cur.fetchall()]

    def update_interview(self, session_id: int, **fields) -> None:
        self._update_row("Interview", "session_id", session_id, fields)

    def delete_interview(self, session_id: int) -> None:
        with self._cursor() as cur:
            cur.execute("DELETE FROM Interview WHERE session_id = ?", (session_id,))

    # definitions for all question definitions
    def create_question(self, session_id: int, question_text: str, question_type: str = None) -> int:
        with self._cursor() as cur:
            cur.execute(
                "INSERT INTO Question (session_id, question_text, question_type) VALUES (?, ?, ?)",
                (session_id, question_text, question_type),
            )
            return cur.lastrowid

    def get_question(self, question_id: int) -> Optional[Dict[str, Any]]:
        cur = self.conn.execute("SELECT * FROM Question WHERE question_id = ?", (question_id,))
        return self._row_to_dict(cur.fetchone())

    def get_questions_by_session(self, session_id: int) -> List[Dict[str, Any]]:
        cur = self.conn.execute(
            "SELECT * FROM Question WHERE session_id = ? ORDER BY question_id", (session_id,)
        )
        return [dict(r) for r in cur.fetchall()]

    def update_question(self, question_id: int, **fields) -> None:
        self._update_row("Question", "question_id", question_id, fields)

    def delete_question(self, question_id: int) -> None:
        with self._cursor() as cur:
            cur.execute("DELETE FROM Question WHERE question_id = ?", (question_id,))

    # definitions for answer information
    def create_answer(
        self,
        question_id: int,
        session_id: int,
        user_id: int,
        response: str = None,
        situation_score: float = None,
        task_score: float = None,
        action_score: float = None,
        results_score: float = None,
        response_time: float = None,
    ) -> int:
        with self._cursor() as cur:
            cur.execute(
                """INSERT INTO Answer
                   (question_id, session_id, user_id, response, situation_score,
                    task_score, action_score, results_score, response_time)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (question_id, session_id, user_id, response, situation_score,
                 task_score, action_score, results_score, response_time),
            )
            return cur.lastrowid

    def get_answer(self, answer_id: int) -> Optional[Dict[str, Any]]:
        cur = self.conn.execute("SELECT * FROM Answer WHERE answer_id = ?", (answer_id,))
        return self._row_to_dict(cur.fetchone())

    def get_answers_by_session(self, session_id: int) -> List[Dict[str, Any]]:
        cur = self.conn.execute(
            "SELECT * FROM Answer WHERE session_id = ? ORDER BY answer_id", (session_id,)
        )
        return [dict(r) for r in cur.fetchall()]

    def get_answer_by_question(self, question_id: int) -> Optional[Dict[str, Any]]:
        cur = self.conn.execute("SELECT * FROM Answer WHERE question_id = ?", (question_id,))
        return self._row_to_dict(cur.fetchone())

    def update_answer(self, answer_id: int, **fields) -> None:
        self._update_row("Answer", "answer_id", answer_id, fields)

    def delete_answer(self, answer_id: int) -> None:
        with self._cursor() as cur:
            cur.execute("DELETE FROM Answer WHERE answer_id = ?", (answer_id,))

    # defintions for feedback information.
    def create_feedback(
        self,
        answer_id: int,
        star_score: int = None,
        missing_info: str = None,
        suggested_answer: str = None,
    ) -> int:
        with self._cursor() as cur:
            cur.execute(
                """INSERT INTO Feedback (answer_id, star_score, missing_info, suggested_answer)
                   VALUES (?, ?, ?, ?)""",
                (answer_id, star_score, missing_info, suggested_answer),
            )
            return cur.lastrowid

    def get_feedback_by_answer(self, answer_id: int) -> Optional[Dict[str, Any]]:
        cur = self.conn.execute("SELECT * FROM Feedback WHERE answer_id = ?", (answer_id,))
        return self._row_to_dict(cur.fetchone())

    def update_feedback(self, feedback_id: int, **fields) -> None:
        self._update_row("Feedback", "feedback_id", feedback_id, fields)

    def delete_feedback(self, feedback_id: int) -> None:
        with self._cursor() as cur:
            cur.execute("DELETE FROM Feedback WHERE feedback_id = ?", (feedback_id,))

   
    # AI Assistance: The below two items were supplied by AI to help supply a collection of information that
    # is need for the feedback page.
    def get_full_session(self, session_id: int) -> Dict[str, Any]:
        """Returns an interview session with its questions, each answer, and feedback nested."""
        interview = self.get_interview(session_id)
        if interview is None:
            return None
        questions = self.get_questions_by_session(session_id)
        for q in questions:
            answer = self.get_answer_by_question(q["question_id"])
            q["answer"] = answer
            if answer:
                q["answer"]["feedback"] = self.get_feedback_by_answer(answer["answer_id"])
        interview["questions"] = questions
        return interview

    # ---------- internal helper ----------

    def _update_row(self, table: str, pk_col: str, pk_val: Any, fields: Dict[str, Any]) -> None:
        if not fields:
            return
        set_clause = ", ".join(f"{col} = ?" for col in fields)
        values = list(fields.values()) + [pk_val]
        with self._cursor() as cur:
            cur.execute(f"UPDATE {table} SET {set_clause} WHERE {pk_col} = ?", values)
