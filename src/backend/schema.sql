PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS User (
    user_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    f_name          TEXT NOT NULL,
    l_name          TEXT NOT NULL,
    password_hash   TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Profile (
    profile_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL UNIQUE,
    career_field    TEXT,
    target_job      TEXT,
    resume_path     TEXT,
    resume_text     TEXT,
    resume_filename TEXT,
    FOREIGN KEY (user_id) REFERENCES User (user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Interview (
    session_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id              INTEGER NOT NULL,
    date                  TEXT,
    time                  TEXT,
    duration              INTEGER,
    score                 REAL,
    session_start_time   TEXT,
    session_end_time     TEXT,
    interview_type       TEXT,
    FOREIGN KEY (user_id) REFERENCES User (user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Question (
    question_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER NOT NULL,
    question_text   TEXT NOT NULL,
    question_type   TEXT,
    FOREIGN KEY (session_id) REFERENCES Interview (session_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Answer (
    answer_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id      INTEGER NOT NULL,
    session_id       INTEGER NOT NULL,
    user_id          INTEGER NOT NULL,
    response         TEXT,
    situation_score  REAL,
    task_score       REAL,
    action_score     REAL,
    results_score    REAL,
    response_time    REAL,
    FOREIGN KEY (question_id) REFERENCES Question (question_id) ON DELETE CASCADE,
    FOREIGN KEY (session_id)  REFERENCES Interview (session_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)     REFERENCES User (user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Feedback (
    feedback_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    answer_id         INTEGER NOT NULL UNIQUE,
    star_score        INTEGER,
    missing_info      TEXT,
    suggested_answer  TEXT,
    FOREIGN KEY (answer_id) REFERENCES Answer (answer_id) ON DELETE CASCADE
);

-- Helpful indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_interview_user ON Interview (user_id);
CREATE INDEX IF NOT EXISTS idx_question_session ON Question (session_id);
CREATE INDEX IF NOT EXISTS idx_answer_question ON Answer (question_id);
CREATE INDEX IF NOT EXISTS idx_answer_session ON Answer (session_id);
CREATE INDEX IF NOT EXISTS idx_answer_user ON Answer (user_id);
