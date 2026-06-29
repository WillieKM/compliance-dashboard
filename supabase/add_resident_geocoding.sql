-- Run this in your Supabase SQL editor
-- 1) GPS clock-in verification existed as dead code: the geofence-distance
--    check in app/api/portal/[slug]/visit/route.ts already queries
--    residents.lat / residents.lng, but those columns never existed, so the
--    check silently always passed. This adds them (auto-geocoded from the
--    free-text address on save, with a manual override available).
-- 2) Also adds family_portal_token, mirroring staff.onboarding_token, for
--    the new read-only family/client portal.

ALTER TABLE residents ADD COLUMN IF NOT EXISTS lat                 NUMERIC;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS lng                 NUMERIC;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS geocoded_at         TIMESTAMP WITH TIME ZONE;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS family_portal_token TEXT UNIQUE;
