import sqlite3

conn = sqlite3.connect("interviewiq.db")
cursor = conn.cursor()

cursor.execute("""
ALTER TABLE Question
ADD COLUMN question_order INTEGER
""")

conn.commit()
conn.close()

print("question_order added successfully")