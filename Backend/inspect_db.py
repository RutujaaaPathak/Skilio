import sqlite3

def main():
    conn = sqlite3.connect("skillo.db")
    cursor = conn.cursor()
    
    # List tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables in database:")
    for table in tables:
        print(f" - {table[0]}")
        
    print("\n--- Users ---")
    try:
        cursor.execute("SELECT id, name, email, role FROM users;")
        users = cursor.fetchall()
        for u in users:
            print(f"ID: {u[0]}, Name: {u[1]}, Email: {u[2]}, Role: {u[3]}")
    except Exception as e:
        print(e)

    print("\n--- Exams ---")
    try:
        cursor.execute("SELECT id, title, subject, status, start_time, end_time FROM exams;")
        exams = cursor.fetchall()
        for ex in exams:
            print(f"ID: {ex[0]}, Title: {ex[1]}, Subject: {ex[2]}, Status: {ex[3]}, Start: {ex[4]}, End: {ex[5]}")
    except Exception as e:
        print(e)

    print("\n--- Exam Assignments ---")
    try:
        cursor.execute("SELECT id, exam_id, student_id, status FROM exam_assignments;")
        assignments = cursor.fetchall()
        for a in assignments:
            print(f"ID: {a[0]}, Exam ID: {a[1]}, Student ID: {a[2]}, Status: {a[3]}")
    except Exception as e:
        print(e)

    print("\n--- Questions ---")
    try:
        cursor.execute("SELECT COUNT(*) FROM questions;")
        print(f"Total Questions: {cursor.fetchone()[0]}")
        cursor.execute("SELECT exam_id, COUNT(*) FROM exam_questions GROUP BY exam_id;")
        eq_counts = cursor.fetchall()
        for ec in eq_counts:
            print(f"Exam ID: {ec[0]} has {ec[1]} questions linked")
    except Exception as e:
        print(e)
        
    print("\n--- Exam Sessions ---")
    try:
        cursor.execute("SELECT id, exam_id, student_id, session_token, status FROM exam_sessions;")
        sessions = cursor.fetchall()
        for s in sessions:
            print(f"ID: {s[0]}, Exam ID: {s[1]}, Student ID: {s[2]}, Token: {s[3]}, Status: {s[4]}")
    except Exception as e:
        print(e)

    conn.close()

if __name__ == "__main__":
    main()
