-- ================================================================
-- Assisted Living Facility (ALF) — WAC 388-78A Specific Tables
-- Run in Supabase SQL Editor
-- ================================================================

-- ── INDIVIDUAL SERVICE PLANS (ISP) ───────────────────────────────
CREATE TABLE IF NOT EXISTS isp_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE isp_records ADD COLUMN IF NOT EXISTS facility_id      UUID;
ALTER TABLE isp_records ADD COLUMN IF NOT EXISTS resident_id      UUID REFERENCES residents(id) ON DELETE CASCADE;
ALTER TABLE isp_records ADD COLUMN IF NOT EXISTS resident_name    TEXT;
ALTER TABLE isp_records ADD COLUMN IF NOT EXISTS admission_date   DATE;
ALTER TABLE isp_records ADD COLUMN IF NOT EXISTS isp_created_date DATE;   -- must be within 30 days
ALTER TABLE isp_records ADD COLUMN IF NOT EXISTS isp_due_date     DATE;   -- 30 days from admission
ALTER TABLE isp_records ADD COLUMN IF NOT EXISTS last_review_date DATE;
ALTER TABLE isp_records ADD COLUMN IF NOT EXISTS next_review_date DATE;   -- annual
ALTER TABLE isp_records ADD COLUMN IF NOT EXISTS reviewed_by      TEXT;
ALTER TABLE isp_records ADD COLUMN IF NOT EXISTS resident_goals   TEXT;
ALTER TABLE isp_records ADD COLUMN IF NOT EXISTS services_provided TEXT;
ALTER TABLE isp_records ADD COLUMN IF NOT EXISTS resident_signed  BOOLEAN DEFAULT false;
ALTER TABLE isp_records ADD COLUMN IF NOT EXISTS rep_signed       BOOLEAN DEFAULT false;
ALTER TABLE isp_records ADD COLUMN IF NOT EXISTS status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','current','overdue_review','needs_update'));
ALTER TABLE isp_records ADD COLUMN IF NOT EXISTS notes           TEXT;

-- ── RESIDENT ASSESSMENTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resident_assessments_al (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE resident_assessments_al ADD COLUMN IF NOT EXISTS facility_id          UUID;
ALTER TABLE resident_assessments_al ADD COLUMN IF NOT EXISTS resident_id          UUID REFERENCES residents(id) ON DELETE CASCADE;
ALTER TABLE resident_assessments_al ADD COLUMN IF NOT EXISTS resident_name        TEXT;
ALTER TABLE resident_assessments_al ADD COLUMN IF NOT EXISTS admission_date       DATE;
ALTER TABLE resident_assessments_al ADD COLUMN IF NOT EXISTS assessment_due_date  DATE;  -- 14 days from admission
ALTER TABLE resident_assessments_al ADD COLUMN IF NOT EXISTS assessment_date      DATE;
ALTER TABLE resident_assessments_al ADD COLUMN IF NOT EXISTS assessed_by          TEXT;
ALTER TABLE resident_assessments_al ADD COLUMN IF NOT EXISTS adl_level            TEXT;
ALTER TABLE resident_assessments_al ADD COLUMN IF NOT EXISTS cognitive_status     TEXT;
ALTER TABLE resident_assessments_al ADD COLUMN IF NOT EXISTS fall_risk            TEXT;
ALTER TABLE resident_assessments_al ADD COLUMN IF NOT EXISTS medication_needs     TEXT;
ALTER TABLE resident_assessments_al ADD COLUMN IF NOT EXISTS special_needs        TEXT;
ALTER TABLE resident_assessments_al ADD COLUMN IF NOT EXISTS next_assessment_date DATE;  -- annual
ALTER TABLE resident_assessments_al ADD COLUMN IF NOT EXISTS notes                TEXT;

-- ── RN DELEGATION LOG ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rn_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE rn_delegations ADD COLUMN IF NOT EXISTS facility_id      UUID;
ALTER TABLE rn_delegations ADD COLUMN IF NOT EXISTS rn_name          TEXT;
ALTER TABLE rn_delegations ADD COLUMN IF NOT EXISTS rn_license       TEXT;
ALTER TABLE rn_delegations ADD COLUMN IF NOT EXISTS delegate_name    TEXT;  -- staff receiving delegation
ALTER TABLE rn_delegations ADD COLUMN IF NOT EXISTS resident_name    TEXT;
ALTER TABLE rn_delegations ADD COLUMN IF NOT EXISTS resident_id      UUID REFERENCES residents(id) ON DELETE SET NULL;
ALTER TABLE rn_delegations ADD COLUMN IF NOT EXISTS medications_delegated TEXT;
ALTER TABLE rn_delegations ADD COLUMN IF NOT EXISTS delegation_date  DATE;
ALTER TABLE rn_delegations ADD COLUMN IF NOT EXISTS expiry_date      DATE;
ALTER TABLE rn_delegations ADD COLUMN IF NOT EXISTS next_review_date DATE;
ALTER TABLE rn_delegations ADD COLUMN IF NOT EXISTS competency_verified BOOLEAN DEFAULT false;
ALTER TABLE rn_delegations ADD COLUMN IF NOT EXISTS notes           TEXT;
ALTER TABLE rn_delegations ADD COLUMN IF NOT EXISTS status          TEXT DEFAULT 'active' CHECK (status IN ('active','expired','revoked'));

-- ── FALL INCIDENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fall_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE fall_incidents ADD COLUMN IF NOT EXISTS facility_id     UUID;
ALTER TABLE fall_incidents ADD COLUMN IF NOT EXISTS resident_id     UUID REFERENCES residents(id) ON DELETE SET NULL;
ALTER TABLE fall_incidents ADD COLUMN IF NOT EXISTS resident_name   TEXT;
ALTER TABLE fall_incidents ADD COLUMN IF NOT EXISTS incident_date   DATE;
ALTER TABLE fall_incidents ADD COLUMN IF NOT EXISTS incident_time   TEXT;
ALTER TABLE fall_incidents ADD COLUMN IF NOT EXISTS location        TEXT;
ALTER TABLE fall_incidents ADD COLUMN IF NOT EXISTS witnessed       BOOLEAN DEFAULT false;
ALTER TABLE fall_incidents ADD COLUMN IF NOT EXISTS injury_sustained BOOLEAN DEFAULT false;
ALTER TABLE fall_incidents ADD COLUMN IF NOT EXISTS injury_description TEXT;
ALTER TABLE fall_incidents ADD COLUMN IF NOT EXISTS immediate_action TEXT;
ALTER TABLE fall_incidents ADD COLUMN IF NOT EXISTS physician_notified BOOLEAN DEFAULT false;
ALTER TABLE fall_incidents ADD COLUMN IF NOT EXISTS family_notified  BOOLEAN DEFAULT false;
ALTER TABLE fall_incidents ADD COLUMN IF NOT EXISTS doh_report_required BOOLEAN DEFAULT false;
ALTER TABLE fall_incidents ADD COLUMN IF NOT EXISTS contributing_factors TEXT;
ALTER TABLE fall_incidents ADD COLUMN IF NOT EXISTS prevention_plan  TEXT;
ALTER TABLE fall_incidents ADD COLUMN IF NOT EXISTS reported_by     TEXT;
ALTER TABLE fall_incidents ADD COLUMN IF NOT EXISTS notes           TEXT;

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE isp_records             ENABLE ROW LEVEL SECURITY;
ALTER TABLE resident_assessments_al ENABLE ROW LEVEL SECURITY;
ALTER TABLE rn_delegations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE fall_incidents          ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isp"         ON isp_records;
DROP POLICY IF EXISTS "tenant_al_assess"   ON resident_assessments_al;
DROP POLICY IF EXISTS "tenant_rn_deleg"    ON rn_delegations;
DROP POLICY IF EXISTS "tenant_falls"       ON fall_incidents;

CREATE POLICY "tenant_isp"       ON isp_records             FOR ALL USING (facility_id = get_my_facility_id());
CREATE POLICY "tenant_al_assess" ON resident_assessments_al FOR ALL USING (facility_id = get_my_facility_id());
CREATE POLICY "tenant_rn_deleg"  ON rn_delegations          FOR ALL USING (facility_id = get_my_facility_id());
CREATE POLICY "tenant_falls"     ON fall_incidents           FOR ALL USING (facility_id = get_my_facility_id());
