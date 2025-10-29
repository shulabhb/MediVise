from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Boolean, Float
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from typing import Dict, List, Optional, Any
import json

Base = declarative_base()

class UserMemory(Base):
    """
    Lightweight user memory system for storing learned information.
    Uses semantic keys and structured data for efficient retrieval.
    """
    __tablename__ = "user_memories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(128), nullable=False, index=True)  # Firebase UID
    
    # Memory categorization
    category = Column(String(64), nullable=False, index=True)  # medications, conditions, preferences, etc.
    key = Column(String(128), nullable=False, index=True)  # semantic key for retrieval
    value = Column(Text, nullable=False)  # JSON string of the memory data
    
    # Memory metadata
    confidence = Column(Float, default=1.0)  # How confident we are in this memory
    source = Column(String(128))  # Where this memory came from (document_id, chat, etc.)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Memory lifecycle
    is_active = Column(Boolean, default=True)
    access_count = Column(Integer, default=0)  # How often this memory is accessed

class DocumentContext(Base):
    """
    Structured context extracted from uploaded PDFs.
    Stores key information for quick retrieval and memory building.
    """
    __tablename__ = "document_contexts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(128), nullable=False, index=True)  # Firebase UID
    document_id = Column(Integer, nullable=False, index=True)  # Reference to documents table
    
    # Extracted context
    medications = Column(JSON)  # List of medications found
    conditions = Column(JSON)  # List of medical conditions
    allergies = Column(JSON)  # List of allergies
    vital_signs = Column(JSON)  # Blood pressure, heart rate, etc.
    lab_results = Column(JSON)  # Lab values and results
    procedures = Column(JSON)  # Medical procedures performed
    providers = Column(JSON)  # Healthcare providers mentioned
    
    # Context metadata
    extraction_confidence = Column(Float, default=0.0)
    last_extracted = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class MemoryInteraction(Base):
    """
    Track memory usage and learning from interactions.
    Helps improve memory relevance and accuracy.
    """
    __tablename__ = "memory_interactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(128), nullable=False, index=True)
    memory_id = Column(Integer, nullable=False, index=True)
    interaction_type = Column(String(32), nullable=False)  # created, updated, accessed, confirmed, denied
    context = Column(Text)  # What triggered this interaction
    timestamp = Column(DateTime, default=datetime.utcnow)
