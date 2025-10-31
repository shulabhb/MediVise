from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from .models import Base
# Import models to register them with Base metadata
from .models_medication import Medication
from .models_appointment import Appointment

# Database URL - set via env
# Examples:
#   sqlite:///./medivise.db
#   postgresql+psycopg://postgres:<PASSWORD>@db.<PROJECT>.supabase.co:5432/postgres?sslmode=require
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./medivise.db"
)

"""SQLite performance pragmas and engine setup.

We keep echo=True for now since logs are in use; consider disabling in production.
"""
engine = create_engine(
    DATABASE_URL,
    echo=True,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

# Apply SQLite pragmas for better concurrency and read performance
if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):  # type: ignore[override]
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL;")
            cursor.execute("PRAGMA synchronous=NORMAL;")
            cursor.execute("PRAGMA temp_store=MEMORY;")
            cursor.execute("PRAGMA cache_size=-20000;")  # ~20MB page cache
        finally:
            cursor.close()

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
def create_tables():
    Base.metadata.create_all(bind=engine)
    # Create helpful indexes if they don't already exist (SQLite-safe)
    if DATABASE_URL.startswith("sqlite"):
        with engine.begin() as conn:
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);"
            ))
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_documents_user_uploaded ON documents(user_id, uploaded_at);"
            ))
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at);"
            ))

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
