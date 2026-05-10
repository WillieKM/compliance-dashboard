-- ================================================================
-- CareCompliance — Full Database Setup (safe to re-run)
-- ================================================================

-- ── 1. ORGANIZATIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ── 2. PROFILES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
-- Add columns individually so it's safe if the table already exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role            TEXT DEFAULT 'organization_admin';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS facility_id     UUID;

-- ── 3. DOCUMENT TYPES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_types (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS name       TEXT;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS category   TEXT;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS applies_to TEXT;

-- ── 4. COMPLIANCE REQUIREMENTS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_requirements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE compliance_requirements ADD COLUMN IF NOT EXISTS applies_to       TEXT;
ALTER TABLE compliance_requirements ADD COLUMN IF NOT EXISTS document_type_id UUID;

-- ── 5. RESIDENTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS residents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE residents ADD COLUMN IF NOT EXISTS facility_id       UUID;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS first_name        TEXT;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS last_name         TEXT;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS status            TEXT DEFAULT 'Active';
ALTER TABLE residents ADD COLUMN IF NOT EXISTS room_number       TEXT;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS date_of_birth     DATE;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS admission_date    DATE;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS emergency_contact TEXT;

-- ── 6. STAFF ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS facility_id UUID;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS first_name  TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_name   TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS role        TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS status      TEXT DEFAULT 'active';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS email       TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone       TEXT;

-- ── 7. DOCUMENTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS facility_id      UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS owner_type       TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS resident_id      UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS staff_id         UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_type_id UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expiration_date  DATE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_url         TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_name        TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status           TEXT DEFAULT 'uploaded';

-- ── 8. ALERTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS facility_id  UUID;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resident_id  UUID;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS document_id  UUID;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS alert_type   TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS title        TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS message      TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS due_date     DATE;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resolved     BOOLEAN DEFAULT false;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resolved_at  TIMESTAMP WITH TIME ZONE;

-- ── 9. SUBSCRIPTIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS organization_id        UUID;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_id                TEXT DEFAULT 'professional';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS status                 TEXT DEFAULT 'active';

-- ── 10. ENABLE ROW LEVEL SECURITY ───────────────────────────────
ALTER TABLE organizations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_types          ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions           ENABLE ROW LEVEL SECURITY;

-- ── 11. HELPER FUNCTIONS ────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_my_facility_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT facility_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ── 12. RLS POLICIES ────────────────────────────────────────────
DROP POLICY IF EXISTS "own_profile"           ON profiles;
DROP POLICY IF EXISTS "tenant_organizations"  ON organizations;
DROP POLICY IF EXISTS "tenant_documents"      ON documents;
DROP POLICY IF EXISTS "tenant_staff"          ON staff;
DROP POLICY IF EXISTS "tenant_residents"      ON residents;
DROP POLICY IF EXISTS "tenant_alerts"         ON alerts;
DROP POLICY IF EXISTS "tenant_subscriptions"  ON subscriptions;
DROP POLICY IF EXISTS "public_document_types" ON document_types;
DROP POLICY IF EXISTS "public_requirements"   ON compliance_requirements;

CREATE POLICY "own_profile"
  ON profiles FOR ALL USING (id = auth.uid());

CREATE POLICY "tenant_organizations"
  ON organizations FOR ALL USING (id = get_my_org_id());

CREATE POLICY "tenant_documents"
  ON documents FOR ALL USING (facility_id = get_my_facility_id());

CREATE POLICY "tenant_staff"
  ON staff FOR ALL USING (facility_id = get_my_facility_id());

CREATE POLICY "tenant_residents"
  ON residents FOR ALL USING (facility_id = get_my_facility_id());

CREATE POLICY "tenant_alerts"
  ON alerts FOR ALL USING (facility_id = get_my_facility_id());

CREATE POLICY "tenant_subscriptions"
  ON subscriptions FOR ALL USING (organization_id = get_my_org_id());

CREATE POLICY "public_document_types"
  ON document_types FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "public_requirements"
  ON compliance_requirements FOR SELECT USING (auth.uid() IS NOT NULL);

-- ── 13. SIGNUP TRIGGER ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_org_id   UUID;
  company_name TEXT;
BEGIN
  company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Organization');

  INSERT INTO organizations (name)
  VALUES (company_name)
  RETURNING id INTO new_org_id;

  INSERT INTO profiles (id, full_name, role, organization_id, facility_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'organization_admin',
    new_org_id,
    new_org_id
  )
  ON CONFLICT (id) DO UPDATE
    SET organization_id = EXCLUDED.organization_id,
        facility_id     = EXCLUDED.facility_id,
        full_name       = EXCLUDED.full_name;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 14. SEED DOCUMENT TYPES ─────────────────────────────────────
INSERT INTO document_types (name, category, applies_to) VALUES
  ('OASIS Assessment',                'Home Care',         'resident'),
  ('Plan of Care',                    'Home Care',         'resident'),
  ('Face-to-Face Encounter',          'Home Care',         'resident'),
  ('Physician Orders',                'Home Care',         'resident'),
  ('Visit Notes',                     'Home Care',         'resident'),
  ('Discharge Summary',               'Home Care',         'resident'),
  ('Care Plan',                       'AFH',               'resident'),
  ('Daily Notes',                     'AFH',               'resident'),
  ('Medication Administration Record','AFH',               'resident'),
  ('Admission Agreement',             'AFH',               'resident'),
  ('Incident Report',                 'AFH',               'resident'),
  ('Service Plan / ISP',              'Assisted Living',   'resident'),
  ('Resident Assessment',             'Assisted Living',   'resident'),
  ('Consent Form',                    'Assisted Living',   'resident'),
  ('Activity Log',                    'Assisted Living',   'resident'),
  ('Safety Report',                   'Assisted Living',   'resident'),
  ('Program Plan',                    'Multi-Service',     'resident'),
  ('Client Record',                   'Multi-Service',     'resident'),
  ('Progress Note',                   'Multi-Service',     'resident'),
  ('CPR Certification',               'Staff Credentials', 'staff'),
  ('First Aid Certification',         'Staff Credentials', 'staff'),
  ('Background Check',                'Staff Credentials', 'staff'),
  ('TB Test / Health Screening',      'Staff Credentials', 'staff'),
  ('Home Care Aide Certificate',      'Staff Credentials', 'staff'),
  ('CNA Certification',               'Staff Credentials', 'staff'),
  ('Nursing License (RN/LPN)',         'Staff Credentials', 'staff'),
  ('Driver License / Insurance',      'Staff Credentials', 'staff'),
  ('Orientation Training',            'Staff Training',    'staff'),
  ('Dementia / Memory Care Training', 'Staff Training',    'staff'),
  ('Infection Control Training',      'Staff Training',    'staff'),
  ('Annual Competency Evaluation',    'Staff Training',    'staff'),
  ('Mandated Reporter Training',      'Staff Training',    'staff'),
  ('Facility License',                'Facility',          'general'),
  ('Business License',                'Facility',          'general'),
  ('Liability Insurance Certificate', 'Facility',          'general'),
  ('Policy & Procedure Manual',       'Facility',          'general'),
  ('Fire Inspection Report',          'Facility',          'general'),
  ('Health Department Inspection',    'Facility',          'general')
ON CONFLICT DO NOTHING;

-- ================================================================
-- DONE.
-- ================================================================
