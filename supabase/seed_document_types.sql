-- ============================================================
-- Document Types Seed
-- Run this in your Supabase SQL editor (once)
-- ============================================================

INSERT INTO document_types (name, category, applies_to) VALUES

-- ── HOME CARE ────────────────────────────────────────────────
  ('OASIS Assessment',              'Home Care',        'resident'),
  ('Plan of Care',                  'Home Care',        'resident'),
  ('Face-to-Face Encounter',        'Home Care',        'resident'),
  ('Physician Orders',              'Home Care',        'resident'),
  ('Visit Notes',                   'Home Care',        'resident'),
  ('Discharge Summary',             'Home Care',        'resident'),

-- ── ADULT FAMILY HOME (AFH) ──────────────────────────────────
  ('Care Plan',                     'AFH',              'resident'),
  ('Daily Notes',                   'AFH',              'resident'),
  ('Incident Report',               'AFH',              'resident'),
  ('Behavioral Support Plan',       'AFH',              'resident'),
  ('Admission Agreement',           'AFH',              'resident'),
  ('Medication Administration Record', 'AFH',           'resident'),

-- ── ASSISTED LIVING ──────────────────────────────────────────
  ('Service Plan / ISP',            'Assisted Living',  'resident'),
  ('Activity Log',                  'Assisted Living',  'resident'),
  ('Safety / Incident Report',      'Assisted Living',  'resident'),
  ('Resident Assessment',           'Assisted Living',  'resident'),
  ('Consent Form',                  'Assisted Living',  'resident'),

-- ── MULTI-SERVICE / GENERAL ──────────────────────────────────
  ('Program Plan',                  'Multi-Service',    'resident'),
  ('Client Record',                 'Multi-Service',    'resident'),
  ('Progress Note',                 'Multi-Service',    'resident'),

-- ── STAFF CREDENTIALS ────────────────────────────────────────
  ('CPR Certification',             'Staff Credentials','staff'),
  ('First Aid Certification',       'Staff Credentials','staff'),
  ('Background Check',              'Staff Credentials','staff'),
  ('TB Test / Health Screening',    'Staff Credentials','staff'),
  ('Home Care Aide Certificate',    'Staff Credentials','staff'),
  ('CNA Certification',             'Staff Credentials','staff'),
  ('Nursing License (RN/LPN)',       'Staff Credentials','staff'),
  ('Driver License / Insurance',    'Staff Credentials','staff'),

-- ── STAFF TRAINING ───────────────────────────────────────────
  ('Orientation Training',          'Staff Training',   'staff'),
  ('Dementia / Memory Care Training','Staff Training',  'staff'),
  ('Infection Control Training',    'Staff Training',   'staff'),
  ('Annual Competency Evaluation',  'Staff Training',   'staff'),
  ('Mandated Reporter Training',    'Staff Training',   'staff'),

-- ── FACILITY / GENERAL ───────────────────────────────────────
  ('Facility License',              'Facility',         'general'),
  ('Business License',              'Facility',         'general'),
  ('Liability Insurance Certificate','Facility',        'general'),
  ('Policy & Procedure Manual',     'Facility',         'general'),
  ('Fire Inspection Report',        'Facility',         'general'),
  ('Health Department Inspection',  'Facility',         'general');
