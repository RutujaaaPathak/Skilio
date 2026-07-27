from app.database import SessionLocal, engine, Base
from app.models.institution import Institution
from app.models.department import Department
from datetime import datetime, timezone

INSTITUTIONS = [
    {"name": "Veermata Jijabai Technological Institute", "code": "VJTI", "city": "Mumbai", "state": "Maharashtra"},
    {"name": "Sardar Patel Institute of Technology", "code": "SPIT", "city": "Mumbai", "state": "Maharashtra"},
    {"name": "Dwarkadas J. Sanghvi College of Engineering", "code": "DJSCE", "city": "Mumbai", "state": "Maharashtra"},
    {"name": "K. J. Somaiya College of Engineering", "code": "KJSCE", "city": "Mumbai", "state": "Maharashtra"},
    {"name": "Thadomal Shahani Engineering College", "code": "TSEC", "city": "Mumbai", "state": "Maharashtra"},
    {"name": "Vivekanand Education Society's Institute of Technology", "code": "VESIT", "city": "Mumbai", "state": "Maharashtra"},
    {"name": "Don Bosco Institute of Technology", "code": "DBIT", "city": "Mumbai", "state": "Maharashtra"},
    {"name": "Fr. Conceicao Rodrigues College of Engineering", "code": "CRCE", "city": "Mumbai", "state": "Maharashtra"},
    {"name": "Shah & Anchor Kutchhi Engineering College", "code": "SAKEC", "city": "Mumbai", "state": "Maharashtra"},
    {"name": "Xavier Institute of Engineering", "code": "XIE", "city": "Mumbai", "state": "Maharashtra"},
]

DEPARTMENTS = [
    "Computer Engineering",
    "Information Technology",
    "Electronics and Telecommunication Engineering",
    "Electronics Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Electrical Engineering",
    "Artificial Intelligence & Data Science",
    "Computer Science & Business Systems",
    "Artificial Intelligence & Machine Learning",
]

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(Institution).count()
        if existing > 0:
            print(f"Database already has {existing} institutions. Skipping seed.")
            return

        for inst_data in INSTITUTIONS:
            inst = Institution(
                name=inst_data["name"],
                code=inst_data["code"],
                city=inst_data.get("city"),
                state=inst_data.get("state"),
                country="India",
                created_at=datetime.now(timezone.utc),
            )
            db.add(inst)
            db.flush()

            for dept_name in DEPARTMENTS:
                dept = Department(
                    institution_id=inst.id,
                    name=dept_name,
                    code="".join(w[0] for w in dept_name.split() if w[0].isalpha()).upper(),
                    created_at=datetime.now(timezone.utc),
                )
                db.add(dept)

        db.commit()
        print(f"Seeded {len(INSTITUTIONS)} institutions with {len(DEPARTMENTS)} departments each.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
