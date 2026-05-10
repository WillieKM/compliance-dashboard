-- ================================================================
-- Care Visit Tracking — Clock In / Clock Out
-- Run in Supabase SQL Editor
-- ================================================================

-- ── CARE VISITS TABLE ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS care_visits (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE care_visits ADD COLUMN IF NOT EXISTS facility_id      UUID;
ALTER TABLE care_visits ADD COLUMN IF NOT EXISTS staff_id         UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE care_visits ADD COLUMN IF NOT EXISTS resident_id      UUID REFERENCES residents(id) ON DELETE SET NULL;
ALTER TABLE care_visits ADD COLUMN IF NOT EXISTS caregiver_name   TEXT;
ALTER TABLE care_visits ADD COLUMN IF NOT EXISTS client_name      TEXT;
ALTER TABLE care_visits ADD COLUMN IF NOT EXISTS care_setting     TEXT DEFAULT 'HOME_CARE';
ALTER TABLE care_visits ADD COLUMN IF NOT EXISTS clock_in_time    TIMESTAMP WITH TIME ZONE;
ALTER TABLE care_visits ADD COLUMN IF NOT EXISTS clock_out_time   TIMESTAMP WITH TIME ZONE;
ALTER TABLE care_visits ADD COLUMN IF NOT EXISTS clock_in_lat     DECIMAL(10,8);
ALTER TABLE care_visits ADD COLUMN IF NOT EXISTS clock_in_lng     DECIMAL(11,8);
ALTER TABLE care_visits ADD COLUMN IF NOT EXISTS clock_in_address TEXT;
ALTER TABLE care_visits ADD COLUMN IF NOT EXISTS clock_out_lat    DECIMAL(10,8);
ALTER TABLE care_visits ADD COLUMN IF NOT EXISTS clock_out_lng    DECIMAL(11,8);
ALTER TABLE care_visits ADD COLUMN IF NOT EXISTS status           TEXT DEFAULT 'active'
  CHECK (status IN ('active','completed','no_show','cancelled'));
ALTER TABLE care_visits ADD COLUMN IF NOT EXISTS duration_minutes INT;
ALTER TABLE care_visits ADD COLUMN IF NOT EXISTS notes            TEXT;

-- ── VISIT SERVICE REPORTS TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS visit_service_reports (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE visit_service_reports ADD COLUMN IF NOT EXISTS visit_id        UUID REFERENCES care_visits(id) ON DELETE CASCADE;
ALTER TABLE visit_service_reports ADD COLUMN IF NOT EXISTS facility_id     UUID;
-- Clinical Q&A
ALTER TABLE visit_service_reports ADD COLUMN IF NOT EXISTS mood_demeanor         TEXT;
ALTER TABLE visit_service_reports ADD COLUMN IF NOT EXISTS behavior_changes      TEXT;
ALTER TABLE visit_service_reports ADD COLUMN IF NOT EXISTS cooperation_level     TEXT;
ALTER TABLE visit_service_reports ADD COLUMN IF NOT EXISTS morning_routine       TEXT;
ALTER TABLE visit_service_reports ADD COLUMN IF NOT EXISTS meal_preparation      TEXT;
ALTER TABLE visit_service_reports ADD COLUMN IF NOT EXISTS care_plan_changes     TEXT;
ALTER TABLE visit_service_reports ADD COLUMN IF NOT EXISTS pain_level            TEXT;
ALTER TABLE visit_service_reports ADD COLUMN IF NOT EXISTS fall_occurred         BOOLEAN DEFAULT false;
ALTER TABLE visit_service_reports ADD COLUMN IF NOT EXISTS incident_occurred     BOOLEAN DEFAULT false;
ALTER TABLE visit_service_reports ADD COLUMN IF NOT EXISTS incident_description  TEXT;
-- ADL Checklist (JSONB array of {task, completed})
ALTER TABLE visit_service_reports ADD COLUMN IF NOT EXISTS adl_checklist     JSONB DEFAULT '[]';
-- Caregiver notes
ALTER TABLE visit_service_reports ADD COLUMN IF NOT EXISTS caregiver_notes   TEXT;
ALTER TABLE visit_service_reports ADD COLUMN IF NOT EXISTS submitted_at      TIMESTAMP WITH TIME ZONE DEFAULT now();

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE care_visits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_service_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_care_visits"   ON care_visits;
DROP POLICY IF EXISTS "tenant_visit_reports" ON visit_service_reports;

CREATE POLICY "tenant_care_visits"   ON care_visits           FOR ALL USING (facility_id = get_my_facility_id());
CREATE POLICY "tenant_visit_reports" ON visit_service_reports FOR ALL USING (facility_id = get_my_facility_id());

-- ================================================================
-- DONE
-- ================================================================
