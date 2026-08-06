import sqlite3

DATABASE_PATH = "interviewiq.db"

migrations = [
    ("Interview", "target_job", "TEXT"),
    ("Interview", "status", "TEXT"),
    ("Interview", "model_name", "TEXT"),
    ("Question", "question_order", "INTEGER"),
    ("Answer", "total_score", "INTEGER"),
    ("Feedback", "feedback_text", "TEXT"),
    ("Feedback", "strengths", "TEXT"),
    ("Feedback", "improvements", "TEXT"),
    ("Feedback", "model_name", "TEXT"),
    ("Feedback", "raw_model_response", "TEXT"),
]

with sqlite3.connect(DATABASE_PATH) as connection:
    for table, column, data_type in migrations:
        existing_columns = {
            row[1]
            for row in connection.execute(
                f"PRAGMA table_info({table})"
            ).fetchall()
        }

        if column in existing_columns:
            print(f"Already exists: {table}.{column}")
            continue

        connection.execute(
            f"ALTER TABLE {table} ADD COLUMN {column} {data_type}"
        )
        print(f"Added: {table}.{column}")

    connection.commit()

print("Database migration complete.")