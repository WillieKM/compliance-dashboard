-- Run in Supabase SQL Editor
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slug          TEXT UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#1a3a52';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url      TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tagline       TEXT;

-- Auto-generate slugs for existing orgs (lowercase, spaces → hyphens)
UPDATE organizations
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Supabase Storage: create a logos bucket (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true)
-- ON CONFLICT DO NOTHING;
