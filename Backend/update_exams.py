import sqlite3
from datetime import datetime, timedelta

def main():
    conn = sqlite3.connect("skillo.db")
    cursor = conn.cursor()
    
    # We want start time in the past and end time in the future
    start_time = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S.%f")
    end_time = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S.%f")
    
    print(f"Updating exams with active times:")
    print(f"Start: {start_time}")
    print(f"End: {end_time}")
    
    # Update exams
    cursor.execute(
        "UPDATE exams SET start_time = ?, end_time = ?, status = 'scheduled' WHERE id IN (1, 2);",
        (start_time, end_time)
    )
    print(f"Updated {cursor.rowcount} exams.")
    
    # Assign student 2 to exam 1 if not already assigned
    cursor.execute("SELECT id FROM exam_assignments WHERE exam_id = 1 AND student_id = 2;")
    existing = cursor.fetchone()
    if not existing:
        cursor.execute(
            "INSERT INTO exam_assignments (exam_id, student_id, status, assigned_by, assigned_at) VALUES (1, 2, 'assigned', 1, ?);",
            (datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f"),)
        )
        print("Assigned Student 2 to Exam 1.")
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    main()
