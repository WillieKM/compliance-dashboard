-- Run this in your Supabase SQL editor
-- Backfills onboarding_token / signing_token for staff created before
-- app/staff/new/page.tsx was fixed to generate them at creation time.
-- Without this, those staff have no working document-upload or
-- welcome-letter-signing link.
UPDATE staff SET onboarding_token = gen_random_uuid()::text WHERE onboarding_token IS NULL;
UPDATE staff SET signing_token    = gen_random_uuid()::text WHERE signing_token    IS NULL;
