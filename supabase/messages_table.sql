-- Run this in your Supabase SQL editor
-- Two-way messaging: office <-> caregiver (via the existing portal/[slug]
-- link) and office <-> family (via the new family-portal token link). No
-- Realtime/websockets — clients poll, matching the rest of this app's
-- request/response pattern. A thread is identified by
-- (channel='caregiver', staff_id=X) or (channel='family', resident_id=Y).

CREATE TABLE IF NOT EXISTS messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS facility_id  UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel      TEXT;  -- 'caregiver' | 'family'
ALTER TABLE messages ADD COLUMN IF NOT EXISTS staff_id     UUID REFERENCES staff(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS resident_id  UUID REFERENCES residents(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_role  TEXT;  -- 'office' | 'caregiver' | 'family'
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_name  TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS body         TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at      TIMESTAMP WITH TIME ZONE;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_messages" ON messages;
CREATE POLICY "tenant_messages" ON messages FOR ALL USING (facility_id = get_my_facility_id());
