CREATE TABLE IF NOT EXISTS afh_residency_agreements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id           UUID REFERENCES residents(id) ON DELETE SET NULL,
  resident_name         TEXT NOT NULL,
  medicaid_resident     BOOLEAN DEFAULT FALSE,
  agreement_date        DATE,
  signed_by_resident    BOOLEAN DEFAULT FALSE,
  signed_by_provider    BOOLEAN DEFAULT FALSE,
  legal_notice_provided BOOLEAN DEFAULT FALSE,
  document_url          TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE afh_residency_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_afh_residency_agreements" ON afh_residency_agreements
  FOR ALL USING (facility_id = get_my_facility_id());
