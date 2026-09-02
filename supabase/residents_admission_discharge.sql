-- Add admission and discharge tracking to residents
ALTER TABLE residents ADD COLUMN IF NOT EXISTS admission_date       DATE;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS discharge_date       DATE;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS discharge_reason     TEXT;
