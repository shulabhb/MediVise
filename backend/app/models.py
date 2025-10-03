from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    firebase_uid = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    date_of_birth = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    conversations = relationship("Conversation", back_populates="user")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    last_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    starred = Column(Boolean, default=False)

    # Foreign Keys
    user_id = Column(Integer, ForeignKey("users.id"))

    # Relationships
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text)
    sender = Column(String)  # 'user' or 'assistant'
    created_at = Column(DateTime, default=datetime.utcnow)
    document_data = Column(JSON, nullable=True)  # For uploaded document info

    # Foreign Keys
    conversation_id = Column(Integer, ForeignKey("conversations.id"))

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    original_name = Column(String)
    file_path = Column(String)
    file_size = Column(Integer)
    content_preview = Column(Text)  # First 1000 chars for preview
    full_content = Column(Text)     # Full extracted text
    document_type = Column(String)  # 'pdf', 'docx', etc.
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Foreign Keys
    user_id = Column(Integer, ForeignKey("users.id"))
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True)

    # Relationships
    user = relationship("User")
    conversation = relationship("Conversation")
