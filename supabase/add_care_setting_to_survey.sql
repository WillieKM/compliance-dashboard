-- Run in Supabase SQL Editor
-- Adds care_setting column to survey_readiness so each setting has its own checklist

ALTER TABLE survey_readiness
  ADD COLUMN IF NOT EXISTS care_setting TEXT DEFAULT 'home-care';

-- Update existing records to be home-care
UPDATE survey_readiness SET care_setting = 'home-care' WHERE care_setting IS NULL;
