-- ================================================================
-- AFH-Specific Tables
-- Run in Supabase SQL Editor
-- ================================================================

-- ── MEDICATION ADMINISTRATION RECORDS (MAR) ──────────────────────
CREATE TABLE IF NOT EXISTS medication_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE medication_records ADD COLUMN IF NOT EXISTS facility_id    UUID;
ALTER TABLE medication_records ADD COLUMN IF NOT EXISTS resident_id    UUID REFERENCES residents(id) ON DELETE CASCADE;
ALTER TABLE medication_records ADD COLUMN IF NOT EXISTS resident_name  TEXT;
ALTER TABLE medication_records ADD COLUMN IF NOT EXISTS medication_name TEXT;
ALTER TABLE medication_records ADD COLUMN IF NOT EXISTS dosage         TEXT;
ALTER TABLE medication_records ADD COLUMN IF NOT EXISTS frequency      TEXT;
ALTER TABLE medication_records ADD COLUMN IF NOT EXISTS prescriber     TEXT;
ALTER TABLE medication_records ADD COLUMN IF NOT EXISTS start_date     DATE;
ALTER TABLE medication_records ADD COLUMN IF NOT EXISTS end_date       DATE;
ALTER TABLE medication_records ADD COLUMN IF NOT EXISTS route          TEXT; -- oral, topical, injection
ALTER TABLE medication_records ADD COLUMN IF NOT EXISTS purpose        TEXT;
ALTER TABLE medication_records ADD COLUMN IF NOT EXISTS is_controlled  BOOLEAN DEFAULT false;
ALTER TABLE medication_records ADD COLUMN IF NOT EXISTS notes          TEXT;
ALTER TABLE medication_records ADD COLUMN IF NOT EXISTS status         TEXT DEFAULT 'active' CHECK (status IN ('active','discontinued','on_hold'));

-- ── MEDICATION ADMINISTRATION LOG (daily entries) ────────────────
CREATE TABLE IF NOT EXISTS mar_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE mar_log ADD COLUMN IF NOT EXISTS facility_id        UUID;
ALTER TABLE mar_log ADD COLUMN IF NOT EXISTS medication_id      UUID REFERENCES medication_records(id) ON DELETE CASCADE;
ALTER TABLE mar_log ADD COLUMN IF NOT EXISTS resident_name      TEXT;
ALTER TABLE mar_log ADD COLUMN IF NOT EXISTS medication_name    TEXT;
ALTER TABLE mar_log ADD COLUMN IF NOT EXISTS administered_at    TIMESTAMP WITH TIME ZONE;
ALTER TABLE mar_log ADD COLUMN IF NOT EXISTS administered_by    TEXT;
ALTER TABLE mar_log ADD COLUMN IF NOT EXISTS given              BOOLEAN DEFAULT true;
ALTER TABLE mar_log ADD COLUMN IF NOT EXISTS reason_not_given   TEXT;
ALTER TABLE mar_log ADD COLUMN IF NOT EXISTS notes              TEXT;

-- ── FIRE DRILL LOG ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fire_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE fire_drills ADD COLUMN IF NOT EXISTS facility_id        UUID;
ALTER TABLE fire_drills ADD COLUMN IF NOT EXISTS drill_date         DATE;
ALTER TABLE fire_drills ADD COLUMN IF NOT EXISTS drill_time         TEXT;
ALTER TABLE fire_drills ADD COLUMN IF NOT EXISTS drill_type         TEXT DEFAULT 'fire' CHECK (drill_type IN ('fire','earthquake','evacuation','lockdown'));
ALTER TABLE fire_drills ADD COLUMN IF NOT EXISTS participants_count INT DEFAULT 0;
ALTER TABLE fire_drills ADD COLUMN IF NOT EXISTS duration_minutes   INT;
ALTER TABLE fire_drills ADD COLUMN IF NOT EXISTS conducted_by       TEXT;
ALTER TABLE fire_drills ADD COLUMN IF NOT EXISTS evacuation_time_seconds INT;
ALTER TABLE fire_drills ADD COLUMN IF NOT EXISTS all_residents_accounted BOOLEAN DEFAULT true;
ALTER TABLE fire_drills ADD COLUMN IF NOT EXISTS issues_noted       TEXT;
ALTER TABLE fire_drills ADD COLUMN IF NOT EXISTS corrective_action  TEXT;
ALTER TABLE fire_drills ADD COLUMN IF NOT EXISTS next_due_date      DATE;
ALTER TABLE fire_drills ADD COLUMN IF NOT EXISTS notes              TEXT;

-- ── ENABLE RLS ────────────────────────────────────────────────────
ALTER TABLE medication_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE mar_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_drills        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_medication_records" ON medication_records;
DROP POLICY IF EXISTS "tenant_mar_log"            ON mar_log;
DROP POLICY IF EXISTS "tenant_fire_drills"        ON fire_drills;

CREATE POLICY "tenant_medication_records" ON medication_records FOR ALL USING (facility_id = get_my_facility_id());
CREATE POLICY "tenant_mar_log"            ON mar_log            FOR ALL USING (facility_id = get_my_facility_id());
CREATE POLICY "tenant_fire_drills"        ON fire_drills        FOR ALL USING (facility_id = get_my_facility_id());

-- ── ADD FOOD HANDLER PERMIT TO PERSONNEL ─────────────────────────
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS food_handler_permit_date   DATE;
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS food_handler_permit_expiry DATE;

-- ================================================================
-- DONE
-- ================================================================
