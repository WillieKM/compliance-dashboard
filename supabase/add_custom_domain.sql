-- Run in Supabase SQL Editor
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT false;
