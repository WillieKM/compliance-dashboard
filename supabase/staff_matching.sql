-- Run this in your Supabase SQL editor
-- Caregiver-client matching for the "Add Shift" scheduling page: skills on
-- staff, plus a simple recurring weekly availability table. No distance/
-- drive-time scoring (no staff home address data) — matching is skill +
-- availability + continuity (has this caregiver served this client before)
-- + a hard conflict filter (double-booking prevention), which didn't exist
-- before at all.

ALTER TABLE staff ADD COLUMN IF NOT EXISTS skills TEXT[];

CREATE TABLE IF NOT EXISTS staff_availability (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS facility_id  UUID;
ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS staff_id     UUID REFERENCES staff(id) ON DELETE CASCADE;
ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS day_of_week  INT;   -- 0 = Sunday .. 6 = Saturday
ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS start_time   TEXT;  -- "HH:MM"
ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS end_time     TEXT;

ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_staff_availability" ON staff_availability;
CREATE POLICY "tenant_staff_availability" ON staff_availability FOR ALL USING (facility_id = get_my_facility_id());
