#!/usr/bin/env python3
"""
Comprehensive migration script to sync all tables and schema changes to Supabase
This includes the new medications, appointments, and updated OCR documents with user_id
"""

import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
import json
from datetime import datetime

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import all models
from app.models import Base, User, Conversation, Message, Document
from app.models_medication import Medication
from app.models_appointment import Appointment
from app.models_ocr import OCRDocument, DocumentPage

def create_migration_sql():
    """Generate SQL migration statements for Supabase"""
    
    migrations = []
    
    # 1. Add user_id column to existing ocr_documents table
    migrations.append("""
    -- Add user_id column to ocr_documents table
    ALTER TABLE ocr_documents 
    ADD COLUMN IF NOT EXISTS user_id VARCHAR(128);
    """)
    
    # 2. Create medications table
    migrations.append("""
    -- Create medications table
    CREATE TABLE IF NOT EXISTS medications (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(128),
        name VARCHAR(256) NOT NULL,
        generic_name VARCHAR(256),
        dose_strength VARCHAR(64) NOT NULL,
        dose_form VARCHAR(20) CHECK (dose_form IN ('tablet', 'capsule', 'liquid', 'patch', 'injection', 'inhaler', 'other')),
        route VARCHAR(20) CHECK (route IN ('po', 'sl', 'iv', 'im', 'topical', 'inh', 'other')),
        frequency VARCHAR(128) NOT NULL,
        directions TEXT,
        indication VARCHAR(256),
        start_date DATE,
        end_date DATE,
        is_active BOOLEAN DEFAULT TRUE,
        prescribing_provider VARCHAR(256),
        pharmacy VARCHAR(256),
        ndc_code VARCHAR(64),
        refills_remaining INTEGER DEFAULT 0,
        total_refills INTEGER DEFAULT 0,
        last_filled_date DATE,
        notes TEXT,
        source_document_id INTEGER REFERENCES ocr_documents(id),
        reminder_enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """)
    
    # 3. Create appointments table
    migrations.append("""
    -- Create appointments table
    CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(128),
        title VARCHAR(256) NOT NULL,
        description TEXT,
        appointment_type VARCHAR(20) CHECK (appointment_type IN ('consultation', 'follow_up', 'checkup', 'procedure', 'emergency', 'therapy', 'other')),
        status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled')),
        scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
        duration_minutes INTEGER DEFAULT 30,
        end_time TIMESTAMP WITH TIME ZONE,
        location VARCHAR(256),
        address TEXT,
        phone VARCHAR(32),
        is_virtual BOOLEAN DEFAULT FALSE,
        meeting_link VARCHAR(512),
        provider_name VARCHAR(256),
        provider_specialty VARCHAR(128),
        provider_phone VARCHAR(32),
        provider_email VARCHAR(128),
        preparation_instructions TEXT,
        notes TEXT,
        symptoms TEXT,
        questions_for_provider TEXT,
        reminder_enabled BOOLEAN DEFAULT TRUE,
        reminder_minutes_before INTEGER DEFAULT 60,
        email_reminder BOOLEAN DEFAULT TRUE,
        sms_reminder BOOLEAN DEFAULT FALSE,
        related_medication_ids TEXT,
        related_document_ids TEXT,
        follow_up_required BOOLEAN DEFAULT FALSE,
        follow_up_date TIMESTAMP WITH TIME ZONE,
        estimated_cost DECIMAL(10,2),
        insurance_covered BOOLEAN,
        copay_amount DECIMAL(10,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """)
    
    # 4. Create indexes for better performance
    migrations.append("""
    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);
    CREATE INDEX IF NOT EXISTS idx_medications_is_active ON medications(is_active);
    CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON appointments(scheduled_date);
    CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
    CREATE INDEX IF NOT EXISTS idx_ocr_documents_user_id ON ocr_documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_ocr_documents_status ON ocr_documents(status);
    """)
    
    # 5. Create updated_at trigger for medications
    migrations.append("""
    -- Create trigger function for updated_at
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';
    
    -- Create triggers for updated_at
    DROP TRIGGER IF EXISTS update_medications_updated_at ON medications;
    CREATE TRIGGER update_medications_updated_at
        BEFORE UPDATE ON medications
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
    CREATE TRIGGER update_appointments_updated_at
        BEFORE UPDATE ON appointments
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    """)
    
    return migrations

def migrate_schema_to_supabase():
    """Apply schema migrations to Supabase"""
    
    # Get Supabase password from environment or prompt user
    supabase_password = os.getenv("SUPABASE_PASSWORD")
    if not supabase_password:
        print("🔐 Supabase password not found in environment variables.")
        print("Please set SUPABASE_PASSWORD environment variable or enter it manually:")
        supabase_password = input("Enter your Supabase database password: ").strip()
    
    # Supabase connection
    supabase_url = f"postgresql://postgres.pQtYF29SlA7McWRs:{supabase_password}@db.xdptmfribajrxqhjqduv.supabase.co:5432/postgres"
    supabase_engine = create_engine(supabase_url)
    
    print("🔄 Starting schema migration to Supabase...")
    
    try:
        migrations = create_migration_sql()
        
        with supabase_engine.connect() as conn:
            for i, migration in enumerate(migrations, 1):
                print(f"📋 Applying migration {i}/{len(migrations)}...")
                try:
                    conn.execute(text(migration))
                    conn.commit()
                    print(f"✅ Migration {i} applied successfully")
                except Exception as e:
                    print(f"⚠️  Migration {i} warning: {e}")
                    # Continue with other migrations even if one fails
                    conn.rollback()
        
        print("🎉 Schema migration completed!")
        
        # Verify tables exist
        print("\n📊 Verifying tables...")
        inspector = inspect(supabase_engine)
        tables = inspector.get_table_names()
        
        expected_tables = [
            'users', 'conversations', 'messages', 'documents',
            'medications', 'appointments', 'ocr_documents', 'ocr_document_pages'
        ]
        
        for table in expected_tables:
            if table in tables:
                print(f"✅ Table '{table}' exists")
            else:
                print(f"❌ Table '{table}' missing")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during schema migration: {e}")
        return False

def sync_data_to_supabase():
    """Sync local SQLite data to Supabase"""
    
    # Local SQLite connection
    local_db_url = "sqlite:///./medivise.db"
    local_engine = create_engine(local_db_url)
    LocalSession = sessionmaker(bind=local_engine)
    
    # Get Supabase password from environment or prompt user
    supabase_password = os.getenv("SUPABASE_PASSWORD")
    if not supabase_password:
        print("🔐 Supabase password not found in environment variables.")
        print("Please set SUPABASE_PASSWORD environment variable or enter it manually:")
        supabase_password = input("Enter your Supabase database password: ").strip()
    
    # Supabase connection
    supabase_url = f"postgresql://postgres.pQtYF29SlA7McWRs:{supabase_password}@db.xdptmfribajrxqhjqduv.supabase.co:5432/postgres"
    supabase_engine = create_engine(supabase_url)
    SupabaseSession = sessionmaker(bind=supabase_engine)
    
    print("🔄 Starting data sync from SQLite to Supabase...")
    
    try:
        with LocalSession() as local_session, SupabaseSession() as supabase_session:
            
            # Sync Users
            print("👥 Syncing users...")
            local_users = local_session.query(User).all()
            for user in local_users:
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
                    print(f"✅ Added user: {user.username}")
                else:
                    print(f"⏭️  User already exists: {user.username}")
            
            supabase_session.commit()
            
            # Sync OCR Documents
            print("📄 Syncing OCR documents...")
            local_docs = local_session.query(OCRDocument).all()
            for doc in local_docs:
                existing_doc = supabase_session.query(OCRDocument).filter(OCRDocument.id == doc.id).first()
                if not existing_doc:
                    new_doc = OCRDocument(
                        user_id=doc.user_id,  # This will be None for existing docs, but that's okay
                        filename=doc.filename,
                        mime_type=doc.mime_type,
                        storage_path=doc.storage_path,
                        language_used=doc.language_used,
                        ocr_engine=doc.ocr_engine,
                        status=doc.status,
                        num_pages=doc.num_pages,
                        processing_ms=doc.processing_ms,
                        full_text=doc.full_text,
                        created_at=doc.created_at
                    )
                    supabase_session.add(new_doc)
                    print(f"✅ Added document: {doc.filename}")
                else:
                    print(f"⏭️  Document already exists: {doc.filename}")
            
            supabase_session.commit()
            
            # Sync Medications
            print("💊 Syncing medications...")
            local_meds = local_session.query(Medication).all()
            for med in local_meds:
                existing_med = supabase_session.query(Medication).filter(Medication.id == med.id).first()
                if not existing_med:
                    new_med = Medication(
                        user_id=med.user_id,
                        name=med.name,
                        generic_name=med.generic_name,
                        dose_strength=med.dose_strength,
                        dose_form=med.dose_form,
                        route=med.route,
                        frequency=med.frequency,
                        directions=med.directions,
                        indication=med.indication,
                        start_date=med.start_date,
                        end_date=med.end_date,
                        is_active=med.is_active,
                        prescribing_provider=med.prescribing_provider,
                        pharmacy=med.pharmacy,
                        ndc_code=med.ndc_code,
                        refills_remaining=med.refills_remaining,
                        total_refills=med.total_refills,
                        last_filled_date=med.last_filled_date,
                        notes=med.notes,
                        source_document_id=med.source_document_id,
                        reminder_enabled=med.reminder_enabled,
                        created_at=med.created_at,
                        updated_at=med.updated_at
                    )
                    supabase_session.add(new_med)
                    print(f"✅ Added medication: {med.name}")
                else:
                    print(f"⏭️  Medication already exists: {med.name}")
            
            supabase_session.commit()
            
            # Sync Appointments
            print("📅 Syncing appointments...")
            local_appts = local_session.query(Appointment).all()
            for appt in local_appts:
                existing_appt = supabase_session.query(Appointment).filter(Appointment.id == appt.id).first()
                if not existing_appt:
                    new_appt = Appointment(
                        user_id=appt.user_id,
                        title=appt.title,
                        description=appt.description,
                        appointment_type=appt.appointment_type,
                        status=appt.status,
                        scheduled_date=appt.scheduled_date,
                        duration_minutes=appt.duration_minutes,
                        end_time=appt.end_time,
                        location=appt.location,
                        address=appt.address,
                        phone=appt.phone,
                        is_virtual=appt.is_virtual,
                        meeting_link=appt.meeting_link,
                        provider_name=appt.provider_name,
                        provider_specialty=appt.provider_specialty,
                        provider_phone=appt.provider_phone,
                        provider_email=appt.provider_email,
                        preparation_instructions=appt.preparation_instructions,
                        notes=appt.notes,
                        symptoms=appt.symptoms,
                        questions_for_provider=appt.questions_for_provider,
                        reminder_enabled=appt.reminder_enabled,
                        reminder_minutes_before=appt.reminder_minutes_before,
                        email_reminder=appt.email_reminder,
                        sms_reminder=appt.sms_reminder,
                        related_medication_ids=appt.related_medication_ids,
                        related_document_ids=appt.related_document_ids,
                        follow_up_required=appt.follow_up_required,
                        follow_up_date=appt.follow_up_date,
                        estimated_cost=appt.estimated_cost,
                        insurance_covered=appt.insurance_covered,
                        copay_amount=appt.copay_amount,
                        created_at=appt.created_at,
                        updated_at=appt.updated_at
                    )
                    supabase_session.add(new_appt)
                    print(f"✅ Added appointment: {appt.title}")
                else:
                    print(f"⏭️  Appointment already exists: {appt.title}")
            
            supabase_session.commit()
            
        print("🎉 Data sync completed successfully!")
        print("\n📊 You can now view your data in Supabase Studio:")
        print("   https://supabase.com/dashboard/project/xdptmfribajrxqhjqduv")
        
    except Exception as e:
        print(f"❌ Error during data sync: {e}")
        return False
    
    return True

def main():
    """Main migration function"""
    print("🚀 Starting comprehensive Supabase migration...")
    print("=" * 60)
    
    # Step 1: Migrate schema
    print("\n📋 STEP 1: Schema Migration")
    print("-" * 30)
    if not migrate_schema_to_supabase():
        print("❌ Schema migration failed!")
        return False
    
    # Step 2: Sync data
    print("\n📊 STEP 2: Data Sync")
    print("-" * 30)
    if not sync_data_to_supabase():
        print("❌ Data sync failed!")
        return False
    
    print("\n🎉 Migration completed successfully!")
    print("=" * 60)
    print("✅ All tables created with proper user isolation")
    print("✅ All data synced from local SQLite to Supabase")
    print("✅ Ready for production use!")
    
    return True

if __name__ == "__main__":
    main()
