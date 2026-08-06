-- Home Care incident log — WAC 246-335-065
-- Mirrors afh_incidents but references home care WAC and adds a "reported_to_doh" flag
-- (DOH requires notification for certain home care incidents per WAC 246-335-025).

CREATE TABLE IF NOT EXISTS home_care_incidents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE home_care_incidents ADD COLUMN IF NOT EXISTS facility_id          UUID;
ALTER TABLE home_care_incidents ADD COLUMN IF NOT EXISTS resident_id          UUID REFERENCES residents(id) ON DELETE SET NULL;
ALTER TABLE home_care_incidents ADD COLUMN IF NOT EXISTS resident_name        TEXT;
ALTER TABLE home_care_incidents ADD COLUMN IF NOT EXISTS incident_type        TEXT DEFAULT 'other';
ALTER TABLE home_care_incidents ADD COLUMN IF NOT EXISTS incident_date        DATE;
ALTER TABLE home_care_incidents ADD COLUMN IF NOT EXISTS incident_time        TEXT;
ALTER TABLE home_care_incidents ADD COLUMN IF NOT EXISTS location             TEXT;
ALTER TABLE home_care_incidents ADD COLUMN IF NOT EXISTS description          TEXT;
ALTER TABLE home_care_incidents ADD COLUMN IF NOT EXISTS witnessed            BOOLEAN DEFAULT false;
ALTER TABLE home_care_incidents ADD COLUMN IF NOT EXISTS injury_sustained     BOOLEAN DEFAULT false;
ALTER TABLE home_care_incidents ADD COLUMN IF NOT EXISTS injury_description   TEXT;
ALTER TABLE home_care_incidents ADD COLUMN IF NOT EXISTS immediate_action     TEXT;
ALTER TABLE home_care_incidents ADD COLUMN IF NOT EXISTS physician_notified   BOOLEAN DEFAULT false;
ALTER TABLE home_care_incidents ADD COLUMN IF NOT EXISTS family_notified      BOOLEAN DEFAULT false;
ALTER TABLE home_care_incidents ADD COLUMN IF NOT EXISTS doh_report_required  BOOLEAN DEFAULT false;
ALTER TABLE home_care_incidents ADD COLUMN IF NOT EXISTS contributing_factors TEXT;
ALTER TABLE home_care_incidents ADD COLUMN IF NOT EXISTS prevention_plan      TEXT;
ALTER TABLE home_care_incidents ADD COLUMN IF NOT EXISTS reported_by          TEXT;
ALTER TABLE home_care_incidents ADD COLUMN IF NOT EXISTS notes                TEXT;

ALTER TABLE home_care_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_home_care_incidents" ON home_care_incidents;
CREATE POLICY "tenant_home_care_incidents" ON home_care_incidents FOR ALL USING (facility_id = get_my_facility_id());
