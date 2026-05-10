-- Run in Supabase SQL Editor

-- ── ASSESSMENTS TABLE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS facility_id         UUID;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS resident_id         UUID REFERENCES residents(id) ON DELETE CASCADE;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS assessment_date     DATE DEFAULT CURRENT_DATE;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS completed_by        TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS assessment_data     JSONB DEFAULT '{}';
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS care_plan_text      TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS care_plan_generated BOOLEAN DEFAULT false;

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_assessments" ON assessments;
CREATE POLICY "tenant_assessments" ON assessments
  FOR ALL USING (facility_id = get_my_facility_id());

-- ── TRIGGER: auto-update resident status when a document changes ─
CREATE OR REPLACE FUNCTION update_resident_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  expired_count  INT;
  expiring_count INT;
  new_status     TEXT;
BEGIN
  IF NEW.resident_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE expiration_date < CURRENT_DATE),
    COUNT(*) FILTER (WHERE expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30)
  INTO expired_count, expiring_count
  FROM documents
  WHERE resident_id = NEW.resident_id;

  IF expired_count > 0 THEN
    new_status := 'overdue';
  ELSIF expiring_count > 0 THEN
    new_status := 'review';
  ELSE
    new_status := 'Active';
  END IF;

  UPDATE residents SET status = new_status WHERE id = NEW.resident_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_document_change ON documents;
CREATE TRIGGER on_document_change
  AFTER INSERT OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_resident_status();
