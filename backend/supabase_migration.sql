-- MediVise Supabase Migration Script
-- Run this in your Supabase SQL Editor to create all tables and schema

-- 1. Create ocr_documents table if it doesn't exist, then add user_id column
CREATE TABLE IF NOT EXISTS ocr_documents (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(128),
    filename VARCHAR(512) NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    storage_path VARCHAR(1024) NOT NULL,
    language_used VARCHAR(64) DEFAULT 'eng',
    ocr_engine VARCHAR(64) DEFAULT 'tesseract',
    status VARCHAR(32) DEFAULT 'completed',
    num_pages INTEGER DEFAULT 0,
    processing_ms INTEGER DEFAULT 0,
    full_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add user_id column if it doesn't exist (for existing tables)
ALTER TABLE ocr_documents 
ADD COLUMN IF NOT EXISTS user_id VARCHAR(128);

-- Create ocr_document_pages table
CREATE TABLE IF NOT EXISTS ocr_document_pages (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES ocr_documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    text TEXT NOT NULL,
    mean_confidence FLOAT DEFAULT 0.0
);

-- 2. Create medications table
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

-- 3. Create appointments table
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

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);
CREATE INDEX IF NOT EXISTS idx_medications_is_active ON medications(is_active);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_ocr_documents_user_id ON ocr_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_ocr_documents_status ON ocr_documents(status);

-- 5. Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Create triggers for updated_at
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

-- 7. Enable Row Level Security (RLS) for user isolation
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_document_pages ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for user isolation
-- Medications policies
CREATE POLICY "Users can view their own medications" ON medications
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own medications" ON medications
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own medications" ON medications
    FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own medications" ON medications
    FOR DELETE USING (user_id = auth.uid()::text);

-- Appointments policies
CREATE POLICY "Users can view their own appointments" ON appointments
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own appointments" ON appointments
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own appointments" ON appointments
    FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own appointments" ON appointments
    FOR DELETE USING (user_id = auth.uid()::text);

-- OCR Documents policies
CREATE POLICY "Users can view their own documents" ON ocr_documents
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own documents" ON ocr_documents
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own documents" ON ocr_documents
    FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own documents" ON ocr_documents
    FOR DELETE USING (user_id = auth.uid()::text);

-- OCR Document Pages policies (inherit from parent document)
CREATE POLICY "Users can view their own document pages" ON ocr_document_pages
    FOR SELECT USING (
        document_id IN (
            SELECT id FROM ocr_documents WHERE user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can insert their own document pages" ON ocr_document_pages
    FOR INSERT WITH CHECK (
        document_id IN (
            SELECT id FROM ocr_documents WHERE user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can update their own document pages" ON ocr_document_pages
    FOR UPDATE USING (
        document_id IN (
            SELECT id FROM ocr_documents WHERE user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete their own document pages" ON ocr_document_pages
    FOR DELETE USING (
        document_id IN (
            SELECT id FROM ocr_documents WHERE user_id = auth.uid()::text
        )
    );

-- 9. Create a view for easy data inspection
CREATE OR REPLACE VIEW user_data_summary AS
SELECT 
    u.firebase_uid,
    u.username,
    u.email,
    COUNT(DISTINCT c.id) as conversation_count,
    COUNT(DISTINCT m.id) as message_count,
    COUNT(DISTINCT d.id) as document_count,
    COUNT(DISTINCT med.id) as medication_count,
    COUNT(DISTINCT a.id) as appointment_count
FROM users u
LEFT JOIN conversations c ON c.user_id = u.id
LEFT JOIN messages m ON m.conversation_id = c.id
LEFT JOIN ocr_documents d ON d.user_id = u.firebase_uid
LEFT JOIN medications med ON med.user_id = u.firebase_uid
LEFT JOIN appointments a ON a.user_id = u.firebase_uid
GROUP BY u.id, u.firebase_uid, u.username, u.email;

-- 10. Grant necessary permissions
GRANT ALL ON medications TO authenticated;
GRANT ALL ON appointments TO authenticated;
GRANT ALL ON ocr_documents TO authenticated;
GRANT ALL ON ocr_document_pages TO authenticated;
GRANT SELECT ON user_data_summary TO authenticated;

-- Success message
SELECT 'MediVise schema migration completed successfully!' as status;
