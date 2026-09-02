-- Multi-Service incident log — WAC 388-71-0560
-- Incident reporting requirements for Multi-Service agencies.
-- DOH notification required for serious incidents per applicable WAC.

CREATE TABLE IF NOT EXISTS multi_service_incidents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE multi_service_incidents ADD COLUMN IF NOT EXISTS facility_id          UUID;
ALTER TABLE multi_service_incidents ADD COLUMN IF NOT EXISTS resident_id          UUID REFERENCES residents(id) ON DELETE SET NULL;
ALTER TABLE multi_service_incidents ADD COLUMN IF NOT EXISTS resident_name        TEXT;
ALTER TABLE multi_service_incidents ADD COLUMN IF NOT EXISTS incident_type        TEXT DEFAULT 'other';
ALTER TABLE multi_service_incidents ADD COLUMN IF NOT EXISTS incident_date        DATE;
ALTER TABLE multi_service_incidents ADD COLUMN IF NOT EXISTS incident_time        TEXT;
ALTER TABLE multi_service_incidents ADD COLUMN IF NOT EXISTS location             TEXT;
ALTER TABLE multi_service_incidents ADD COLUMN IF NOT EXISTS description          TEXT;
ALTER TABLE multi_service_incidents ADD COLUMN IF NOT EXISTS witnessed            BOOLEAN DEFAULT false;
ALTER TABLE multi_service_incidents ADD COLUMN IF NOT EXISTS injury_sustained     BOOLEAN DEFAULT false;
ALTER TABLE multi_service_incidents ADD COLUMN IF NOT EXISTS injury_description   TEXT;
ALTER TABLE multi_service_incidents ADD COLUMN IF NOT EXISTS immediate_action     TEXT;
ALTER TABLE multi_service_incidents ADD COLUMN IF NOT EXISTS physician_notified   BOOLEAN DEFAULT false;
ALTER TABLE multi_service_incidents ADD COLUMN IF NOT EXISTS family_notified      BOOLEAN DEFAULT false;
ALTER TABLE multi_service_incidents ADD COLUMN IF NOT EXISTS doh_report_required  BOOLEAN DEFAULT false;
ALTER TABLE multi_service_incidents ADD COLUMN IF NOT EXISTS contributing_factors TEXT;
ALTER TABLE multi_service_incidents ADD COLUMN IF NOT EXISTS prevention_plan      TEXT;
ALTER TABLE multi_service_incidents ADD COLUMN IF NOT EXISTS reported_by          TEXT;
ALTER TABLE multi_service_incidents ADD COLUMN IF NOT EXISTS notes                TEXT;

ALTER TABLE multi_service_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_multi_service_incidents" ON multi_service_incidents;
CREATE POLICY "tenant_multi_service_incidents" ON multi_service_incidents FOR ALL USING (facility_id = get_my_facility_id());
