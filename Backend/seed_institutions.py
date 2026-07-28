import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import SessionLocal, engine, Base
from app.models.institution import Institution
from app.models.department import Department

ENGINEERING_BRANCHES = [
    ("Computer Engineering", "CO"),
    ("Information Technology", "IT"),
    ("Electronics and Telecommunication Engineering", "EXTC"),
    ("Electronics Engineering", "EX"),
    ("Electrical Engineering", "EE"),
    ("Mechanical Engineering", "ME"),
    ("Civil Engineering", "CE"),
    ("Chemical Engineering", "CHE"),
    ("Artificial Intelligence and Data Science", "AI-DS"),
    ("Artificial Intelligence and Machine Learning", "AI-ML"),
    ("Computer Science and Engineering", "CSE"),
    ("Data Science", "DS"),
    ("Electronics and Computer Science", "ECS"),
    ("Robotics and Automation", "RA"),
    ("Biomedical Engineering", "BME"),
    ("Biotechnology", "BT"),
    ("Instrumentation Engineering", "IE"),
    ("Production Engineering", "PE"),
    ("Textile Engineering", "TE"),
    ("Automobile Engineering", "AE"),
    ("Mechatronics", "MT"),
    ("Aerospace Engineering", "ASE"),
    ("Marine Engineering", "MNE"),
    ("Petroleum Engineering", "PTE"),
    ("Environmental Engineering", "ENE"),
    ("Cyber Security", "CS"),
    ("Computer Science and Business Systems", "CSBS"),
    ("Internet of Things", "IOT"),
    ("Computer Science and Information Technology", "CS-IT"),
    ("Electronics and Computer Engineering", "ECE"),
]

MUMBAI_COLLEGES = [
    ("Indian Institute of Technology Bombay", "IITB", "Powai, Mumbai", "Mumbai"),
    ("Veermata Jijabai Technological Institute", "VJTI", "Matunga, Mumbai", "Mumbai"),
    ("Sardar Patel Institute of Technology", "SPIT", "Andheri West, Mumbai", "Mumbai"),
    ("Dwarkadas J. Sanghvi College of Engineering", "DJSCE", "Vile Parle West, Mumbai", "Mumbai"),
    ("Sardar Patel College of Engineering", "SPCE", "Andheri West, Mumbai", "Mumbai"),
    ("Thadomal Shahani Engineering College", "TSEC", "Bandra West, Mumbai", "Mumbai"),
    ("K.J. Somaiya College of Engineering", "KJSCE", "Vidyavihar, Mumbai", "Mumbai"),
    ("Don Bosco Institute of Technology", "DBIT", "Kurla West, Mumbai", "Mumbai"),
    ("Atharva College of Engineering", "ACE", "Malad West, Mumbai", "Mumbai"),
    ("M.H. Saboo Siddik College of Engineering", "MHSSCE", "Byculla, Mumbai", "Mumbai"),
    ("Shah & Anchor Kutchhi Engineering College", "SAKEC", "Chembur, Mumbai", "Mumbai"),
    ("Vivekanand Education Society's Institute of Technology", "VESIT", "Chembur, Mumbai", "Mumbai"),
    ("Rajiv Gandhi Institute of Technology", "RGIT", "Andheri West, Mumbai", "Mumbai"),
    ("Bharati Vidyapeeth's College of Engineering", "BVCOE", "CBD Belapur, Navi Mumbai", "Mumbai"),
    ("St. Francis Institute of Technology", "SFIT", "Borivali West, Mumbai", "Mumbai"),
    ("Xavier Institute of Engineering", "XIE", "Mahim, Mumbai", "Mumbai"),
    ("Fr. Conceicao Rodrigues College of Engineering", "CRCE", "Bandra West, Mumbai", "Mumbai"),
    ("Rizvi College of Engineering", "RCOE", "Bandra West, Mumbai", "Mumbai"),
    ("Shree L.R. Tiwari College of Engineering", "SLRTCE", "Mira Road, Mumbai", "Mumbai"),
    ("K.C. College of Engineering and Management Studies and Research", "KCCEMSR", "Thane, Mumbai", "Mumbai"),
    ("Vidyavardhini's College of Engineering and Technology", "VCET", "Vasai, Mumbai", "Mumbai"),
    ("Usha Mittal Institute of Technology", "UMIT", "Santacruz West, Mumbai", "Mumbai"),
    ("Lokmanya Tilak College of Engineering", "LTCE", "Navi Mumbai", "Mumbai"),
    ("Maharashtra Institute of Technology", "MIT", "Chembur, Mumbai", "Mumbai"),
    ("Alamuri Ratnamala Institute of Engineering and Technology", "ARMIT", "Thane, Mumbai", "Mumbai"),
    ("B.K. Birla College of Engineering", "BKB", "Kalyan, Mumbai", "Mumbai"),
    ("Agnel Charities' Polytechnic & Engineering College", "ACPEC", "Vashi, Navi Mumbai", "Mumbai"),
    ("Terna Engineering College", "TEC", "Nerul, Navi Mumbai", "Mumbai"),
    ("Pillai College of Engineering", "PCE", "New Panvel, Navi Mumbai", "Mumbai"),
    ("SIES Graduate School of Technology", "SIESGST", "Nerul, Navi Mumbai", "Mumbai"),
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(Institution).count()
        if existing > 0:
            print(f"Database already has {existing} institutions. Clearing and re-seeding...")
            db.query(Department).delete()
            db.query(Institution).delete()
            db.commit()

        for name, code, address, city in MUMBAI_COLLEGES:
            inst = Institution(
                name=name,
                code=code,
                address=address,
                city=city,
                state="Maharashtra",
                country="India",
                is_active=True,
            )
            db.add(inst)
            db.flush()
            for dept_name, dept_code in ENGINEERING_BRANCHES:
                dept = Department(
                    institution_id=inst.id,
                    name=dept_name,
                    code=dept_code,
                    is_active=True,
                )
                db.add(dept)
        db.commit()
        print(f"Seeded {len(MUMBAI_COLLEGES)} colleges with {len(ENGINEERING_BRANCHES)} branches each!")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
