-- Run this in your Supabase SQL editor (safe to re-run)
--
-- Problem: document_types has no link to care setting, so every staff
-- member and every admin uploading a resident document sees the full
-- catalog regardless of which setting(s) the org actually operates.
-- Separately, compliance_requirements (which drives the "Compliance
-- Checklist" / "Missing Requirements" sections) has never been seeded
-- at all, so those sections have likely always been empty.

-- 1. Add care-setting scoping to the document catalog. NULL/empty array
-- means the document type applies to every setting.
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS care_settings TEXT[];

-- 2. Resident document types — map directly from their existing category.
UPDATE document_types SET care_settings = ARRAY['HOME_CARE']       WHERE category = 'Home Care';
UPDATE document_types SET care_settings = ARRAY['AFH']             WHERE category = 'AFH';
UPDATE document_types SET care_settings = ARRAY['ASSISTED_LIVING'] WHERE category = 'Assisted Living';
UPDATE document_types SET care_settings = ARRAY['MULTI_SERVICE']   WHERE category = 'Multi-Service';

-- 3. Staff document types — only the setting-specific ones; everything
-- else (CPR, Background Check, TB Test, Driver License, Nursing License,
-- Orientation/Infection-Control/Mandated-Reporter/Annual-Competency
-- training) stays NULL = universal.
UPDATE document_types SET care_settings = ARRAY['HOME_CARE']             WHERE name = 'Home Care Aide Certificate';
UPDATE document_types SET care_settings = ARRAY['AFH','ASSISTED_LIVING'] WHERE name = 'CNA Certification';
UPDATE document_types SET care_settings = ARRAY['AFH','ASSISTED_LIVING'] WHERE name = 'Dementia / Memory Care Training';

-- 4. Seed compliance_requirements: one row per document type per
-- applicable care setting (facility_type is NOT NULL and single-valued,
-- so a universal document type gets 4 rows, one per setting), so the
-- checklist/missing-requirements features have something to check against.
DELETE FROM compliance_requirements; -- clears the partial insert from the failed run

INSERT INTO compliance_requirements (applies_to, document_type_id, facility_type)
SELECT
  dt.applies_to,
  dt.id,
  setting
FROM document_types dt
CROSS JOIN unnest(
  CASE
    WHEN dt.care_settings IS NULL OR array_length(dt.care_settings, 1) IS NULL
      THEN ARRAY['HOME_CARE','AFH','ASSISTED_LIVING','MULTI_SERVICE']
    ELSE dt.care_settings
  END
) AS setting
WHERE dt.applies_to IN ('staff', 'resident');
