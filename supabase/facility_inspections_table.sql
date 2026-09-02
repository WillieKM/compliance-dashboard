-- DSHS inspection log + findings/CAP tracker
-- Works across all care settings (AFH, Home Care, AL, Multi-Service)
-- Run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS facility_inspections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  care_setting     TEXT NOT NULL DEFAULT 'AFH',
  inspection_date  DATE,
  inspection_type  TEXT DEFAULT 'annual',
  -- annual | complaint | follow_up | licensing | fire | other
  inspector_name   TEXT,
  inspector_phone  TEXT,
  inspector_email  TEXT,
  dshs_region      TEXT,
  outcome          TEXT DEFAULT 'pending',
  -- pending | no_deficiencies | deficiencies_found | conditional
  overall_notes    TEXT,
  next_inspection_date DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE facility_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_facility_inspections" ON facility_inspections
  FOR ALL USING (facility_id = get_my_facility_id());

CREATE INDEX IF NOT EXISTS idx_facility_inspections_facility
  ON facility_inspections (facility_id, inspection_date DESC);

-- ─── Findings / deficiencies + CAP tracker ───────────────────────────────────

CREATE TABLE IF NOT EXISTS inspection_findings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  inspection_id    UUID NOT NULL REFERENCES facility_inspections(id) ON DELETE CASCADE,
  wac_citation     TEXT,
  severity         TEXT DEFAULT 'noncritical',
  -- critical | serious | noncritical
  description      TEXT NOT NULL,
  corrective_action TEXT,
  deadline         DATE,
  resolved         BOOLEAN DEFAULT FALSE,
  resolved_date    DATE,
  resolved_notes   TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inspection_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_inspection_findings" ON inspection_findings
  FOR ALL USING (facility_id = get_my_facility_id());

CREATE INDEX IF NOT EXISTS idx_inspection_findings_inspection
  ON inspection_findings (inspection_id);
