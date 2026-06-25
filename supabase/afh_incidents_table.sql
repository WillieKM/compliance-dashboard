-- Run this in your Supabase SQL editor
-- AFH had no structured incident log — only the generic document upload for
-- the "Incident Report" document type. This mirrors Assisted Living's
-- fall_incidents pattern, generalized to any incident type (AFH covers more
-- than falls: behavioral, medication error, elopement, injury, etc.).

CREATE TABLE IF NOT EXISTS afh_incidents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE afh_incidents ADD COLUMN IF NOT EXISTS facility_id         UUID;
ALTER TABLE afh_incidents ADD COLUMN IF NOT EXISTS resident_id         UUID REFERENCES residents(id) ON DELETE SET NULL;
ALTER TABLE afh_incidents ADD COLUMN IF NOT EXISTS resident_name       TEXT;
ALTER TABLE afh_incidents ADD COLUMN IF NOT EXISTS incident_type       TEXT DEFAULT 'other';
ALTER TABLE afh_incidents ADD COLUMN IF NOT EXISTS incident_date       DATE;
ALTER TABLE afh_incidents ADD COLUMN IF NOT EXISTS incident_time       TEXT;
ALTER TABLE afh_incidents ADD COLUMN IF NOT EXISTS location            TEXT;
ALTER TABLE afh_incidents ADD COLUMN IF NOT EXISTS description         TEXT;
ALTER TABLE afh_incidents ADD COLUMN IF NOT EXISTS witnessed           BOOLEAN DEFAULT false;
ALTER TABLE afh_incidents ADD COLUMN IF NOT EXISTS injury_sustained    BOOLEAN DEFAULT false;
ALTER TABLE afh_incidents ADD COLUMN IF NOT EXISTS injury_description  TEXT;
ALTER TABLE afh_incidents ADD COLUMN IF NOT EXISTS immediate_action    TEXT;
ALTER TABLE afh_incidents ADD COLUMN IF NOT EXISTS physician_notified  BOOLEAN DEFAULT false;
ALTER TABLE afh_incidents ADD COLUMN IF NOT EXISTS family_notified     BOOLEAN DEFAULT false;
ALTER TABLE afh_incidents ADD COLUMN IF NOT EXISTS doh_report_required BOOLEAN DEFAULT false;
ALTER TABLE afh_incidents ADD COLUMN IF NOT EXISTS contributing_factors TEXT;
ALTER TABLE afh_incidents ADD COLUMN IF NOT EXISTS prevention_plan     TEXT;
ALTER TABLE afh_incidents ADD COLUMN IF NOT EXISTS reported_by         TEXT;
ALTER TABLE afh_incidents ADD COLUMN IF NOT EXISTS notes               TEXT;

ALTER TABLE afh_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_afh_incidents" ON afh_incidents;
CREATE POLICY "tenant_afh_incidents" ON afh_incidents FOR ALL USING (facility_id = get_my_facility_id());
