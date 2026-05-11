-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS invite_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS code          TEXT UNIQUE;
ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS created_for   TEXT;       -- company name
ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS care_setting  TEXT;       -- pre-set care setting
ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS expires_at    TIMESTAMP WITH TIME ZONE;
ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS used          BOOLEAN DEFAULT false;
ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS used_by       TEXT;
ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS used_at       TIMESTAMP WITH TIME ZONE;
ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS notes         TEXT;

-- Public: anyone can READ a code to validate it (needed during signup)
-- Only service role can INSERT/UPDATE
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_invite" ON invite_codes;
CREATE POLICY "public_read_invite" ON invite_codes
  FOR SELECT USING (true);
