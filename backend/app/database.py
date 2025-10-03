from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from .models import Base

# Database URL - set via env
# Examples:
#   sqlite:///./medivise.db
#   postgresql+psycopg://postgres:<PASSWORD>@db.<PROJECT>.supabase.co:5432/postgres?sslmode=require
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./medivise.db"
)

# Create engine (sync)
engine = create_engine(DATABASE_URL, echo=True, pool_pre_ping=True)

# Session factory
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
