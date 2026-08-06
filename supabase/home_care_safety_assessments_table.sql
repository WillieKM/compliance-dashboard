-- Home Care in-home safety assessment — WAC 246-335-055
-- Required alongside the plan of care. Documents hazards, fall risk,
-- medication access, and emergency planning at the client's home.

CREATE TABLE IF NOT EXISTS home_care_safety_assessments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE home_care_safety_assessments ADD COLUMN IF NOT EXISTS facility_id         UUID;
ALTER TABLE home_care_safety_assessments ADD COLUMN IF NOT EXISTS resident_id         UUID REFERENCES residents(id) ON DELETE SET NULL;
ALTER TABLE home_care_safety_assessments ADD COLUMN IF NOT EXISTS resident_name       TEXT;
ALTER TABLE home_care_safety_assessments ADD COLUMN IF NOT EXISTS assessment_date     DATE;
ALTER TABLE home_care_safety_assessments ADD COLUMN IF NOT EXISTS assessed_by         TEXT;
ALTER TABLE home_care_safety_assessments ADD COLUMN IF NOT EXISTS fall_risk           TEXT DEFAULT 'low';   -- low / medium / high
ALTER TABLE home_care_safety_assessments ADD COLUMN IF NOT EXISTS fall_risk_notes     TEXT;
ALTER TABLE home_care_safety_assessments ADD COLUMN IF NOT EXISTS hazards_identified  TEXT;
ALTER TABLE home_care_safety_assessments ADD COLUMN IF NOT EXISTS medication_access   TEXT DEFAULT 'safe';  -- safe / needs_lockbox / other
ALTER TABLE home_care_safety_assessments ADD COLUMN IF NOT EXISTS medication_notes    TEXT;
ALTER TABLE home_care_safety_assessments ADD COLUMN IF NOT EXISTS emergency_plan      TEXT;
ALTER TABLE home_care_safety_assessments ADD COLUMN IF NOT EXISTS emergency_contacts  TEXT;
ALTER TABLE home_care_safety_assessments ADD COLUMN IF NOT EXISTS smoke_detector      BOOLEAN DEFAULT false;
ALTER TABLE home_care_safety_assessments ADD COLUMN IF NOT EXISTS co_detector         BOOLEAN DEFAULT false;
ALTER TABLE home_care_safety_assessments ADD COLUMN IF NOT EXISTS clear_egress        BOOLEAN DEFAULT false;
ALTER TABLE home_care_safety_assessments ADD COLUMN IF NOT EXISTS action_items        TEXT;
ALTER TABLE home_care_safety_assessments ADD COLUMN IF NOT EXISTS next_assessment_date DATE;  -- typically annual
ALTER TABLE home_care_safety_assessments ADD COLUMN IF NOT EXISTS notes               TEXT;

ALTER TABLE home_care_safety_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_home_care_safety" ON home_care_safety_assessments;
CREATE POLICY "tenant_home_care_safety" ON home_care_safety_assessments FOR ALL USING (facility_id = get_my_facility_id());
