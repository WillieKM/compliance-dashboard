-- Run this in your Supabase SQL editor
-- AFH had no due-date-aware Care Plan (ISP) tracking — only the generic
-- "Assessment → Care Plan" link to /residents with no deadline logic.
-- WAC 388-76-10415 requires an Individual Care Plan within 30 days of
-- admission, reviewed at least every 6 months. This mirrors Assisted
-- Living's resident_assessments_al pattern, retimed for AFH's cycle.

CREATE TABLE IF NOT EXISTS afh_care_plans (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE afh_care_plans ADD COLUMN IF NOT EXISTS facility_id        UUID;
ALTER TABLE afh_care_plans ADD COLUMN IF NOT EXISTS resident_id        UUID REFERENCES residents(id) ON DELETE CASCADE;
ALTER TABLE afh_care_plans ADD COLUMN IF NOT EXISTS resident_name      TEXT;
ALTER TABLE afh_care_plans ADD COLUMN IF NOT EXISTS admission_date     DATE;
ALTER TABLE afh_care_plans ADD COLUMN IF NOT EXISTS care_plan_due_date DATE;  -- 30 days from admission
ALTER TABLE afh_care_plans ADD COLUMN IF NOT EXISTS care_plan_date     DATE;
ALTER TABLE afh_care_plans ADD COLUMN IF NOT EXISTS prepared_by        TEXT;
ALTER TABLE afh_care_plans ADD COLUMN IF NOT EXISTS adl_level          TEXT;
ALTER TABLE afh_care_plans ADD COLUMN IF NOT EXISTS cognitive_status   TEXT;
ALTER TABLE afh_care_plans ADD COLUMN IF NOT EXISTS services_provided  TEXT;
ALTER TABLE afh_care_plans ADD COLUMN IF NOT EXISTS medication_needs   TEXT;
ALTER TABLE afh_care_plans ADD COLUMN IF NOT EXISTS special_needs      TEXT;
ALTER TABLE afh_care_plans ADD COLUMN IF NOT EXISTS next_review_date   DATE;  -- 6 months from care_plan_date
ALTER TABLE afh_care_plans ADD COLUMN IF NOT EXISTS notes              TEXT;

ALTER TABLE afh_care_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_afh_care_plans" ON afh_care_plans;
CREATE POLICY "tenant_afh_care_plans" ON afh_care_plans FOR ALL USING (facility_id = get_my_facility_id());
