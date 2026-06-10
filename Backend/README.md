# Skillo — Backend

Offline-First AI Exam Platform.

## Setup

```bash
cd Backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

## Run

```bash
uvicorn app.main:app --reload
```

## Endpoints

| Method | Path       | Description    |
| ------ | ---------- | -------------- |
| GET    | `/health`  | Health check   |

## Project Structure

```
Backend/
├── app/
│   ├── core/          # config, security
│   ├── models/        # SQLAlchemy models
│   ├── schemas/       # Pydantic schemas
│   ├── routes/        # API route modules
│   ├── services/      # Business logic
│   ├── utils/         # Helpers
│   ├── database.py    # SQLAlchemy engine & session
│   └── main.py        # FastAPI entry point
├── requirements.txt
└── .env.example
```
