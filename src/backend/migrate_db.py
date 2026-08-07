import sqlite3

DATABASE = "interviewiq.db"

conn = sqlite3.connect(DATABASE)
cursor = conn.cursor()

try:
    cursor.execute("""
        ALTER TABLE Interview
        ADD COLUMN overall_feedback TEXT
    """)

    cursor.execute("""
        ALTER TABLE Interview
        ADD COLUMN overall_strengths TEXT
    """)

    cursor.execute("""
        ALTER TABLE Interview
        ADD COLUMN overall_improvements TEXT
    """)

    conn.commit()

    print("Interview table updated successfully!")

except sqlite3.Error as error:
    print("Database error:", error)

finally:
    conn.close()