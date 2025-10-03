#!/usr/bin/env python3
"""
Script to sync local SQLite data to Supabase PostgreSQL
Run this when you want to push your local development data to Supabase
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import json

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models import Base, User, Conversation, Message, Document
from app.database import get_db

def sync_to_supabase():
    """Sync local SQLite data to Supabase"""
    
    # Local SQLite connection
    local_db_url = "sqlite:///./medivise.db"
    local_engine = create_engine(local_db_url)
    LocalSession = sessionmaker(bind=local_engine)
    
    # Supabase connection
    supabase_url = "postgresql://postgres.pQtYF29SlA7McWRs@db.xdptmfribajrxqhjqduv.supabase.co:5432/postgres"
    supabase_engine = create_engine(supabase_url)
    SupabaseSession = sessionmaker(bind=supabase_engine)
    
    print("🔄 Starting sync from SQLite to Supabase...")
    
    try:
        # Create tables in Supabase if they don't exist
        print("📋 Creating tables in Supabase...")
        Base.metadata.create_all(bind=supabase_engine)
        
        with LocalSession() as local_session, SupabaseSession() as supabase_session:
            # Sync Users
            print("👥 Syncing users...")
            local_users = local_session.query(User).all()
            for user in local_users:
                # Check if user exists in Supabase
                existing_user = supabase_session.query(User).filter(User.firebase_uid == user.firebase_uid).first()
                if not existing_user:
                    new_user = User(
                        firebase_uid=user.firebase_uid,
                        username=user.username,
                        email=user.email,
                        first_name=user.first_name,
                        last_name=user.last_name,
                        date_of_birth=user.date_of_birth
                    )
                    supabase_session.add(new_user)
                    supabase_session.flush()  # Get the ID
                    print(f"✅ Added user: {user.username}")
                else:
                    print(f"⏭️  User already exists: {user.username}")
            
            supabase_session.commit()
            
            # Sync Conversations
            print("💬 Syncing conversations...")
            local_conversations = local_session.query(Conversation).all()
            for conv in local_conversations:
                # Get the user ID from Supabase
                supabase_user = supabase_session.query(User).filter(User.firebase_uid == conv.user.firebase_uid).first()
                if supabase_user:
                    existing_conv = supabase_session.query(Conversation).filter(
                        Conversation.title == conv.title,
                        Conversation.user_id == supabase_user.id
                    ).first()
                    
                    if not existing_conv:
                        new_conv = Conversation(
                            title=conv.title,
                            last_message=conv.last_message,
                            starred=conv.starred,
                            user_id=supabase_user.id
                        )
                        supabase_session.add(new_conv)
                        supabase_session.flush()  # Get the ID
                        print(f"✅ Added conversation: {conv.title}")
                    else:
                        print(f"⏭️  Conversation already exists: {conv.title}")
            
            supabase_session.commit()
            
            # Sync Messages
            print("📝 Syncing messages...")
            local_messages = local_session.query(Message).all()
            for msg in local_messages:
                # Get the conversation ID from Supabase
                supabase_conv = supabase_session.query(Conversation).filter(
                    Conversation.title == msg.conversation.title,
                    Conversation.user_id == supabase_session.query(User).filter(
                        User.firebase_uid == msg.conversation.user.firebase_uid
                    ).first().id
                ).first()
                
                if supabase_conv:
                    existing_msg = supabase_session.query(Message).filter(
                        Message.text == msg.text,
                        Message.conversation_id == supabase_conv.id,
                        Message.sender == msg.sender
                    ).first()
                    
                    if not existing_msg:
                        new_msg = Message(
                            text=msg.text,
                            sender=msg.sender,
                            document_data=msg.document_data,
                            conversation_id=supabase_conv.id
                        )
                        supabase_session.add(new_msg)
                        print(f"✅ Added message: {msg.text[:50]}...")
                    else:
                        print(f"⏭️  Message already exists")
            
            supabase_session.commit()
            
        print("🎉 Sync completed successfully!")
        print("\n📊 You can now view your data in Supabase Studio:")
        print("   https://supabase.com/dashboard/project/xdptmfribajrxqhjqduv")
        
    except Exception as e:
        print(f"❌ Error during sync: {e}")
        return False
    
    return True

if __name__ == "__main__":
    sync_to_supabase()
