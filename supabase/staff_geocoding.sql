-- Run this in your Supabase SQL editor
-- Adds a home address + coordinates to staff, mirroring what
-- add_resident_geocoding.sql already did for residents. Used for
-- distance-based caregiver ranking in lib/scheduling/matchCaregivers.ts.
-- Auto-geocoded on save in app/staff/[id]/edit/page.tsx, with a manual
-- override field. Staff without an address simply get no distance bonus
-- when ranked — same treatment as missing skills/availability data.

ALTER TABLE staff ADD COLUMN IF NOT EXISTS address     TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS lat         NUMERIC;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS lng         NUMERIC;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMP WITH TIME ZONE;
