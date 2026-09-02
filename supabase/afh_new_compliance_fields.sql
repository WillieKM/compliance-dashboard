-- AFH compliance fields: DWDA preference, discharge legal notice, emergency window clearance
-- Run in Supabase SQL editor

ALTER TABLE residents
  ADD COLUMN IF NOT EXISTS dwda_preference TEXT DEFAULT 'not_specified',
  ADD COLUMN IF NOT EXISTS afh_legal_notice_provided BOOLEAN DEFAULT FALSE;

ALTER TABLE afh_safety_assessments
  ADD COLUMN IF NOT EXISTS emergency_window_clearance BOOLEAN DEFAULT FALSE;
