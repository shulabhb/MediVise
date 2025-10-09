from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
import os
import uuid
import shutil
from datetime import datetime
import json
from app.auth import get_current_user
from app.database import get_db, create_tables, engine
from sqlalchemy import text
from app.models import User, Conversation, Message as MessageModel

app = FastAPI(title="MediVise API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:5174", 
        "http://127.0.0.1:5174",
        "http://localhost:5175", 
        "http://127.0.0.1:5175",
        "http://localhost:5176", 
        "http://127.0.0.1:5176",
        "http://localhost:5177", 
        "http://127.0.0.1:5177"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    try:
        create_tables()
        print("Database tables created successfully")
    except Exception as e:
        print(f"Database connection failed: {e}")

# Include OCR router
from app.routers_ocr import router as ocr_router
app.include_router(ocr_router)

# Include other routers
from app.routers.medications import router as medications_router
from app.routers.appointments import router as appointments_router
app.include_router(medications_router)
app.include_router(appointments_router)

@app.get("/")
def read_root():
    return {"Hello": "MediVise API"}

@app.get("/test")
def test():
    return {"status": "OK", "message": "Backend is working"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
