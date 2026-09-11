-- DOH Reportable Events Log
-- WAC 246-335-440 (HC), WAC 388-76-04100 (AFH), WAC 388-78A-2550 (AL)
-- Tracks incidents filed with DOH — separate from the internal incident log
CREATE TABLE IF NOT EXISTS doh_reportable_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id         UUID NOT NULL,
  care_setting        TEXT NOT NULL,    -- HOME_CARE | AFH | AL
  event_date          DATE NOT NULL,
  event_type          TEXT NOT NULL,    -- abuse | neglect | death | serious_injury | elopement | medication_error | fall_with_injury | other
  resident_name       TEXT,
  description         TEXT NOT NULL,
  doh_notified_date   DATE,
  doh_notified_by     TEXT,
  doh_case_number     TEXT,
  status              TEXT NOT NULL DEFAULT 'pending',  -- pending | filed | acknowledged | closed
  related_incident_id UUID,
  follow_up_notes     TEXT,
  created_by          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE doh_reportable_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "facility_isolation" ON doh_reportable_events
  USING (facility_id = get_my_facility_id());
