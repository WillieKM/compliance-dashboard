-- Run this in your Supabase SQL editor
-- Lets office-initiated family-portal messages actually notify someone.
-- residents.emergency_contact is free text and isn't exposed in any form
-- today, so there was no real email to send to for the family channel.
ALTER TABLE residents ADD COLUMN IF NOT EXISTS family_contact_email TEXT;
