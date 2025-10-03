from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from .models import Base

# Database URL - you can set this as an environment variable
# For development: sqlite:///./medivise.db
# For production: postgresql://postgres.pQtYF29SlA7McWRs@db.xdptmfribajrxqhjqduv.supabase.co:5432/postgres
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres.pQtYF29SlA7McWRs@db.xdptmfribajrxqhjqduv.supabase.co:5432/postgres"
)

# Convert to asyncpg URL for better compatibility
ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# Create engine with asyncpg
engine = create_engine(ASYNC_DATABASE_URL, echo=True)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
def create_tables():
    Base.metadata.create_all(bind=engine)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
