import sqlite3
# pyrefly: ignore [missing-import]
import bcrypt

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def main():
    conn = sqlite3.connect("skillo.db")
    cursor = conn.cursor()
    
    hashed = hash_password("password123")
    
    cursor.execute("UPDATE users SET hashed_password = ? WHERE id IN (1, 2);", (hashed,))
    print(f"Updated password to 'password123' for {cursor.rowcount} users.")
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    main()
