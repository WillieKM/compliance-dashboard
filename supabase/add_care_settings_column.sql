-- Run in Supabase SQL Editor
-- Adds care_settings to organizations
-- Default = all 4 settings (existing accounts see everything)

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS care_settings TEXT[]
  DEFAULT '{HOME_CARE,AFH,ASSISTED_LIVING,MULTI_SERVICE}';
