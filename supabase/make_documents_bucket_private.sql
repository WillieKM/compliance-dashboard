-- Run this in your Supabase SQL editor
-- The "documents" bucket holds background checks, IDs, TB results, signed
-- letters, and resident/staff photos — none of that should be reachable via
-- a permanent public URL. The "logos" bucket stays public; that's
-- intentionally public branding shown on login/portal pages.
UPDATE storage.buckets SET public = false WHERE id = 'documents';
