-- Medication Destruction Log
-- WAC 388-76-10530: two-witness documentation required when controlled substances are destroyed
CREATE TABLE IF NOT EXISTS medication_destruction_log (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id        UUID NOT NULL,
  resident_name      TEXT,
  medication_name    TEXT NOT NULL,
  strength           TEXT,
  quantity_amount    TEXT NOT NULL,
  unit               TEXT,
  lot_number         TEXT,
  expiration_date    DATE,
  reason             TEXT NOT NULL,           -- expired | discontinued | death | damaged | other
  destruction_method TEXT NOT NULL,           -- flush | waste_bin | return_pharmacy | disposal_box | other
  destruction_date   DATE NOT NULL,
  staff_name         TEXT NOT NULL,
  witness1_name      TEXT NOT NULL,
  witness2_name      TEXT,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE medication_destruction_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "facility_isolation" ON medication_destruction_log
  USING (facility_id = get_my_facility_id());
