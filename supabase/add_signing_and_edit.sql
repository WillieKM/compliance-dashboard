-- ============================================================
-- Run in Supabase SQL Editor after add_photos_smtp.sql
-- ============================================================

-- Staff: online signing support
ALTER TABLE staff ADD COLUMN IF NOT EXISTS signing_token TEXT UNIQUE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS signed_at      TIMESTAMPTZ;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS signature_url  TEXT;

-- Generate signing tokens for all existing staff that don't have one
UPDATE staff SET signing_token = gen_random_uuid()::text WHERE signing_token IS NULL;

-- Organizations: notification email for admin digests
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS notification_email TEXT;
