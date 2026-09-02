CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id   UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name     TEXT,
  action        TEXT        NOT NULL,        -- "created", "updated", "deleted", "cleared", "signed_off", "logged"
  entity_type   TEXT        NOT NULL,        -- "incident", "care_plan", "medication_log", "note", "resident", "staff"
  entity_id     TEXT,
  entity_name   TEXT,                        -- Human-readable e.g. "Fall incident – John Doe"
  details       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_facility_created ON audit_logs(facility_id, created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_audit_logs_select" ON audit_logs
  FOR SELECT USING (facility_id = get_my_facility_id());

CREATE POLICY "tenant_audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (facility_id = get_my_facility_id());
