-- Run this in your Supabase SQL editor
-- Adds tracking for the "Branded Email Setup" concierge add-on.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email_addon_status TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email_addon_note TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email_addon_subscription_item_id TEXT;
