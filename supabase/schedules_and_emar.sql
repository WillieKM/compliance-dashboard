-- ================================================================
-- Home Care Scheduling + AFH eMAR Improvements
-- ================================================================

-- ── HOME CARE SCHEDULES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS facility_id    UUID;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS staff_id       UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS resident_id    UUID REFERENCES residents(id) ON DELETE SET NULL;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS caregiver_name TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS client_name    TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS start_time     TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS end_time       TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS care_type      TEXT DEFAULT 'home_care_visit';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS notes          TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS status         TEXT DEFAULT 'scheduled';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS visit_id       UUID REFERENCES care_visits(id) ON DELETE SET NULL;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS recurrence     TEXT; -- none, daily, weekly, biweekly

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_schedules" ON schedules;
CREATE POLICY "tenant_schedules" ON schedules FOR ALL USING (facility_id = get_my_facility_id());

-- ── eMAR: ADD TIME SLOT TO MEDICATION RECORDS ────────────────────
ALTER TABLE medication_records ADD COLUMN IF NOT EXISTS time_slot TEXT DEFAULT 'morning'
  CHECK (time_slot IN ('morning','afternoon','evening','bedtime','prn','other'));
ALTER TABLE medication_records ADD COLUMN IF NOT EXISTS scheduled_time TEXT; -- e.g. "08:00"

-- ================================================================
-- DONE
-- ================================================================
