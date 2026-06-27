-- Run this in your Supabase SQL editor
-- "Staff Training" document types (Orientation, Dementia/Memory Care,
-- Infection Control, Annual Competency, Mandated Reporter) are no longer
-- required for a caregiver to complete onboarding upload. They still show
-- up as optional, but don't block "I'm Done" or count toward progress.
UPDATE compliance_requirements
SET required = false
WHERE document_type_id IN (
  SELECT id FROM document_types WHERE category = 'Staff Training'
);
