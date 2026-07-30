import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import SessionLocal, engine, Base
from app.models.institution import Institution
from app.models.department import Department

ENGINEERING_BRANCHES = [
    ("Computer Engineering", "CO"),
    ("Information Technology", "IT"),
    ("Computer Science and Engineering", "CSE"),
    ("Artificial Intelligence and Data Science", "AI-DS"),
    ("Artificial Intelligence and Machine Learning", "AI-ML"),
    ("Data Science", "DS"),
    ("Computer Science and Information Technology", "CS-IT"),
    ("Computer Science and Business Systems", "CSBS"),
    ("Cyber Security", "CS"),
    ("Internet of Things", "IOT"),
    ("Blockchain Technology", "BCT"),
    ("Cloud Computing", "CC"),
    ("Electronics and Telecommunication Engineering", "EXTC"),
    ("Electronics Engineering", "EX"),
    ("Electronics and Computer Science", "ECS"),
    ("Electronics and Computer Engineering", "ECE"),
    ("Electrical Engineering", "EE"),
    ("Electrical and Electronics Engineering", "EEE"),
    ("Power Engineering", "PE"),
    ("Mechanical Engineering", "ME"),
    ("Automobile Engineering", "AE"),
    ("Mechatronics", "MT"),
    ("Robotics and Automation", "RA"),
    ("Aerospace Engineering", "ASE"),
    ("Marine Engineering", "MNE"),
    ("Production Engineering", "PRDE"),
    ("Industrial Engineering", "IE"),
    ("Civil Engineering", "CE"),
    ("Environmental Engineering", "ENE"),
    ("Structural Engineering", "STE"),
    ("Chemical Engineering", "CHE"),
    ("Biotechnology", "BT"),
    ("Biomedical Engineering", "BME"),
    ("Bioinformatics", "BINF"),
    ("Food Technology", "FT"),
    ("Textile Engineering", "TE"),
    ("Instrumentation Engineering", "INS"),
    ("Instrumentation and Control Engineering", "ICE"),
    ("Petroleum Engineering", "PTE"),
    ("Mining Engineering", "MINE"),
    ("Metallurgical Engineering", "MTE"),
    ("Nanotechnology", "NANO"),
    ("Nuclear Engineering", "NUE"),
    ("Agricultural Engineering", "AGE"),
    ("Printing and Packaging Technology", "PPT"),
    ("Leather Technology", "LT"),
    ("Polymer Engineering", "PYE"),
    ("Dairy Technology", "DT"),
    ("Pharmaceutical Engineering", "PHE"),
    ("Construction Engineering", "CONE"),
    ("Safety and Fire Engineering", "SFE"),
    ("Transportation Engineering", "TE"),
    ("Geoinformatics", "GEO"),
    ("Renewable Energy Engineering", "REE"),
]

MUMBAI_COLLEGES = [
    # Premier Institutes
    ("Indian Institute of Technology Bombay", "IITB", "Powai, Mumbai", "Mumbai"),
    ("Institute of Chemical Technology", "ICT", "Matunga, Mumbai", "Mumbai"),
    ("Veermata Jijabai Technological Institute", "VJTI", "Matunga, Mumbai", "Mumbai"),

    # Autonomous & Top Private Colleges
    ("Sardar Patel Institute of Technology", "SPIT", "Andheri West, Mumbai", "Mumbai"),
    ("Dwarkadas J. Sanghvi College of Engineering", "DJSCE", "Vile Parle West, Mumbai", "Mumbai"),
    ("Sardar Patel College of Engineering", "SPCE", "Andheri West, Mumbai", "Mumbai"),
    ("Thadomal Shahani Engineering College", "TSEC", "Bandra West, Mumbai", "Mumbai"),
    ("K.J. Somaiya College of Engineering", "KJSCE", "Vidyavihar, Mumbai", "Mumbai"),
    ("K.J. Somaiya Institute of Engineering and Information Technology", "KJSIEIT", "Vidyavihar, Mumbai", "Mumbai"),
    ("Don Bosco Institute of Technology", "DBIT", "Kurla West, Mumbai", "Mumbai"),
    ("Mukesh Patel School of Technology Management and Engineering", "MPSTME", "Vile Parle West, Mumbai", "Mumbai"),
    ("Vidyalankar Institute of Technology", "VIT", "Wadala East, Mumbai", "Mumbai"),
    ("Watumull Institute of Electronic Engineering and Computer Technology", "WIEECT", "Worli, Mumbai", "Mumbai"),
    ("Usha Mittal Institute of Technology", "UMIT", "Santacruz West, Mumbai", "Mumbai"),

    # Mumbai University Affiliated Colleges
    ("Atharva College of Engineering", "ACE", "Malad West, Mumbai", "Mumbai"),
    ("M.H. Saboo Siddik College of Engineering", "MHSSCE", "Byculla, Mumbai", "Mumbai"),
    ("Shah & Anchor Kutchhi Engineering College", "SAKEC", "Chembur, Mumbai", "Mumbai"),
    ("Vivekanand Education Society's Institute of Technology", "VESIT", "Chembur, Mumbai", "Mumbai"),
    ("Rajiv Gandhi Institute of Technology", "RGIT", "Andheri West, Mumbai", "Mumbai"),
    ("St. Francis Institute of Technology", "SFIT", "Borivali West, Mumbai", "Mumbai"),
    ("Xavier Institute of Engineering", "XIE", "Mahim, Mumbai", "Mumbai"),
    ("Fr. Conceicao Rodrigues College of Engineering", "CRCE", "Bandra West, Mumbai", "Mumbai"),
    ("Rizvi College of Engineering", "RCOE", "Bandra West, Mumbai", "Mumbai"),
    ("Thakur College of Engineering and Technology", "TCET", "Kandivali East, Mumbai", "Mumbai"),
    ("Maharashtra Institute of Technology", "MIT", "Chembur, Mumbai", "Mumbai"),
    ("Universal College of Engineering", "UCOE", "Vasai, Mumbai", "Mumbai"),
    ("Mumbai Engineering College", "MEC", "Mumbai", "Mumbai"),

    # Navi Mumbai & Thane Region
    ("Bharati Vidyapeeth's College of Engineering", "BVCOE", "CBD Belapur, Navi Mumbai", "Mumbai"),
    ("Terna Engineering College", "TEC", "Nerul, Navi Mumbai", "Mumbai"),
    ("SIES Graduate School of Technology", "SIESGST", "Nerul, Navi Mumbai", "Mumbai"),
    ("Ramrao Adik Institute of Technology", "RAIT", "Nerul, Navi Mumbai", "Mumbai"),
    ("Dr. D.Y. Patil School of Engineering", "DYPSE", "Nerul, Navi Mumbai", "Mumbai"),
    ("Pillai College of Engineering", "PCE", "New Panvel, Navi Mumbai", "Mumbai"),
    ("Annasaheb Chudaman Patil College of Engineering", "ACPCE", "Kharghar, Navi Mumbai", "Mumbai"),
    ("Agnel Charities' Polytechnic & Engineering College", "ACPEC", "Vashi, Navi Mumbai", "Mumbai"),
    ("Datta Meghe College of Engineering", "DMCE", "Airoli, Navi Mumbai", "Mumbai"),
    ("Lokmanya Tilak College of Engineering", "LTCE", "Sector 4, Navi Mumbai", "Mumbai"),
    ("Shivajirao S. Jondhle College of Engineering and Technology", "SSJCET", "Dombivli, Mumbai", "Mumbai"),
    ("AP Shah Institute of Technology", "APSIT", "Thane West, Mumbai", "Mumbai"),
    ("K.C. College of Engineering and Management Studies and Research", "KCCEMSR", "Thane, Mumbai", "Mumbai"),
    ("Shree L.R. Tiwari College of Engineering", "SLRTCE", "Mira Road, Mumbai", "Mumbai"),
    ("Vidyavardhini's College of Engineering and Technology", "VCET", "Vasai, Mumbai", "Mumbai"),
    ("Alamuri Ratnamala Institute of Engineering and Technology", "ARMIT", "Thane, Mumbai", "Mumbai"),
    ("B.K. Birla College of Engineering", "BKB", "Kalyan, Mumbai", "Mumbai"),

    # Other Mumbai Region
    ("G.V. Acharya Institute of Engineering and Technology", "GVAIET", "Khalapur, Mumbai", "Mumbai"),
    ("Bharati Vidyapeeth's College of Engineering for Women", "BVCOEW", "CBD Belapur, Navi Mumbai", "Mumbai"),
    ("Pillai HOC College of Engineering and Technology", "PHOC", "Rasayani, Mumbai", "Mumbai"),
    ("Abhinav Institute of Technology and Management", "AITM", "Dadar, Mumbai", "Mumbai"),
    ("S.S.P.M. College of Engineering", "SSPM", "Kankavli, Mumbai", "Mumbai"),
    ("Shri Jaykumar Rawal Institute of Technology", "SJRIT", "Dombivli, Mumbai", "Mumbai"),
    ("Shailesh J. Mehta School of Management (IIT Bombay)", "SJMSOM", "Powai, Mumbai", "Mumbai"),
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
