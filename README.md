# MediVise - Dev Setup

## Prerequisites
- Python 3.9+
- Node 18+
- Homebrew (macOS)

## Backend (FastAPI)

1) Create venv and install deps
```
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2) Local development (SQLite)
```
export DATABASE_URL="sqlite:///./medivise.db"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Health check: http://127.0.0.1:8000/health

3) Supabase (Postgres)
- Set `DATABASE_URL` with your Supabase connection string:
```
export DATABASE_URL="postgresql://<user>:<password>@<host>:5432/postgres"
```
- Note: On macOS you may need PostgreSQL client libs for psycopg2. If needed:
```
brew reinstall postgresql@14
export DYLD_LIBRARY_PATH="/opt/homebrew/lib:$DYLD_LIBRARY_PATH"
```

## Frontend (Vite + React + TS)
```
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

## Auth
- Firebase Auth is used on the client
- Backend verifies Firebase ID tokens for protected routes (send `Authorization: Bearer <id_token>`)

## Chat API
- `POST /chat/conversations` create
- `GET /chat/conversations` list
- `GET /chat/conversations/{id}` load
- `POST /chat/message` send
- `PATCH /chat/conversations/{id}` rename/star
- `DELETE /chat/conversations/{id}` delete

## Documents
- `POST /documents/upload` accepts PDFs and parses via PyPDF2

## CORS
Allowed origins: http://localhost:5173, http://127.0.0.1:5173


