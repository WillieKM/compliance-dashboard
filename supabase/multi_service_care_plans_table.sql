-- Run this in your Supabase SQL editor
-- Multi-Service care plan tracking — WAC 388-71-0520 (In-Home Services) requires a plan
-- of care created and signed before/at start of services, reviewed within
-- 60 days. Mirrors home_care_plans but scoped to the multi_service_care_plans table.
-- Key difference from AFH: the plan is due at start of services (not N days later),
-- and the review cycle is 60 days (not 6 months).

CREATE TABLE IF NOT EXISTS multi_service_care_plans (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE multi_service_care_plans ADD COLUMN IF NOT EXISTS facility_id            UUID;
ALTER TABLE multi_service_care_plans ADD COLUMN IF NOT EXISTS resident_id            UUID REFERENCES residents(id) ON DELETE CASCADE;
ALTER TABLE multi_service_care_plans ADD COLUMN IF NOT EXISTS resident_name          TEXT;
ALTER TABLE multi_service_care_plans ADD COLUMN IF NOT EXISTS start_of_services_date DATE;
ALTER TABLE multi_service_care_plans ADD COLUMN IF NOT EXISTS care_plan_due_date     DATE;  -- = start_of_services_date (plan required at/before services begin)
ALTER TABLE multi_service_care_plans ADD COLUMN IF NOT EXISTS care_plan_date         DATE;
ALTER TABLE multi_service_care_plans ADD COLUMN IF NOT EXISTS prepared_by            TEXT;
ALTER TABLE multi_service_care_plans ADD COLUMN IF NOT EXISTS services_provided      TEXT;
ALTER TABLE multi_service_care_plans ADD COLUMN IF NOT EXISTS medication_needs       TEXT;
ALTER TABLE multi_service_care_plans ADD COLUMN IF NOT EXISTS special_needs          TEXT;
ALTER TABLE multi_service_care_plans ADD COLUMN IF NOT EXISTS next_review_date       DATE;  -- = care_plan_date + 60 days
ALTER TABLE multi_service_care_plans ADD COLUMN IF NOT EXISTS notes                  TEXT;

ALTER TABLE multi_service_care_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_multi_service_care_plans" ON multi_service_care_plans;
CREATE POLICY "tenant_multi_service_care_plans" ON multi_service_care_plans FOR ALL USING (facility_id = get_my_facility_id());
