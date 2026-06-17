-- ============================================================
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Staff photo
ALTER TABLE staff ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Application notes (stores extra apply-form fields for pending applicants)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS application_notes TEXT;

-- Residents photo
ALTER TABLE residents ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Per-org SMTP / email configuration
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS smtp_host        TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS smtp_port        INTEGER DEFAULT 587;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS smtp_user        TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS smtp_pass        TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS smtp_from_name   TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS smtp_from_email  TEXT;

-- Remove Physician Orders and AFH License from document_types
DELETE FROM document_types
WHERE name ILIKE '%physician%orders%'
   OR name ILIKE '%afh license%'
   OR name ILIKE '%afh%license%';
