-- Run in Supabase SQL Editor

-- 1. Add super_admin flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- 2. Mark YOUR account as super admin
-- Replace the email below with your login email
UPDATE profiles
SET is_super_admin = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'murimiwill@gmail.com' LIMIT 1
);

-- Verify
SELECT id, full_name, is_super_admin FROM profiles WHERE is_super_admin = true;
