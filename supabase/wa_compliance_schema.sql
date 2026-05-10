-- ================================================================
-- Washington State WAC 246-335 Compliance Module
-- Self-contained — safe to run independently
-- ================================================================

-- ── HELPER FUNCTIONS (created here in case setup_multitenancy.sql hasn't run) ──
CREATE OR REPLACE FUNCTION get_my_facility_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT facility_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ── PERSONNEL COMPLIANCE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS personnel_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS facility_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id) ON DELETE CASCADE;
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS hire_date DATE;
-- Background Checks (WAC 246-335-085)
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS bg_check_initial_date DATE;
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS bg_check_initial_result TEXT CHECK (bg_check_initial_result IN ('clear','issues','pending'));
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS bg_check_renewal_due DATE;
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS bg_check_renewal_date DATE;
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS bg_check_renewal_result TEXT CHECK (bg_check_renewal_result IN ('clear','issues','pending'));
-- TB Assessments (WAC 246-335-083)
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS tb_assessment_initial_date DATE;
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS tb_assessment_initial_result TEXT CHECK (tb_assessment_initial_result IN ('negative','positive','not_tested'));
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS tb_assessment_annual_due DATE;
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS tb_assessment_last_date DATE;
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS tb_assessment_last_result TEXT CHECK (tb_assessment_last_result IN ('negative','positive','not_tested'));
-- Credentials
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS license_type TEXT;
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS license_expiration_date DATE;
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS license_current BOOLEAN DEFAULT true;
-- Training (WAC 246-335-080)
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS orientation_complete_date DATE;
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS infection_control_training_date DATE;
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS bloodborne_pathogen_training_date DATE;
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS tb_training_date DATE;
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS mandatory_reporter_training_date DATE;
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS emergency_preparedness_training_date DATE;
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS annual_training_due_date DATE;
-- Performance
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS last_performance_eval_date DATE;
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS performance_eval_due_date DATE;
-- Status
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS compliance_status TEXT DEFAULT 'at_risk' CHECK (compliance_status IN ('compliant','at_risk','non_compliant'));
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS missing_documents TEXT[] DEFAULT '{}';
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS expiring_documents TEXT[] DEFAULT '{}';
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS documentation_notes TEXT;
ALTER TABLE personnel_compliance ADD COLUMN IF NOT EXISTS last_audited_date DATE;

-- ── BACKGROUND CHECKS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS background_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE background_checks ADD COLUMN IF NOT EXISTS facility_id UUID;
ALTER TABLE background_checks ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id) ON DELETE CASCADE;
ALTER TABLE background_checks ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE background_checks ADD COLUMN IF NOT EXISTS check_type TEXT DEFAULT 'initial_dshs' CHECK (check_type IN ('initial_dshs','renewal_wsp','renewal_dshs'));
ALTER TABLE background_checks ADD COLUMN IF NOT EXISTS submitted_date DATE;
ALTER TABLE background_checks ADD COLUMN IF NOT EXISTS result_date DATE;
ALTER TABLE background_checks ADD COLUMN IF NOT EXISTS result TEXT CHECK (result IN ('clear','issues','pending'));
ALTER TABLE background_checks ADD COLUMN IF NOT EXISTS next_due_date DATE;
ALTER TABLE background_checks ADD COLUMN IF NOT EXISTS notes TEXT;

-- ── TB ASSESSMENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tb_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE tb_assessments ADD COLUMN IF NOT EXISTS facility_id UUID;
ALTER TABLE tb_assessments ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id) ON DELETE CASCADE;
ALTER TABLE tb_assessments ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE tb_assessments ADD COLUMN IF NOT EXISTS assessment_type TEXT DEFAULT 'initial' CHECK (assessment_type IN ('initial','annual'));
ALTER TABLE tb_assessments ADD COLUMN IF NOT EXISTS assessment_date DATE;
ALTER TABLE tb_assessments ADD COLUMN IF NOT EXISTS result TEXT CHECK (result IN ('negative','positive','not_tested'));
ALTER TABLE tb_assessments ADD COLUMN IF NOT EXISTS tested_by TEXT;
ALTER TABLE tb_assessments ADD COLUMN IF NOT EXISTS next_due_date DATE;
ALTER TABLE tb_assessments ADD COLUMN IF NOT EXISTS risk_factors TEXT;
ALTER TABLE tb_assessments ADD COLUMN IF NOT EXISTS notes TEXT;

-- ── TRAINING RECORDS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS facility_id UUID;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id) ON DELETE CASCADE;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS training_type TEXT;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS training_date DATE;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS training_topic TEXT;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS duration_minutes INT;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS certification_number TEXT;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS certification_expiration DATE;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS notes TEXT;

-- ── CLIENT DOCUMENTATION ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS facility_id UUID;
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS resident_id UUID REFERENCES residents(id) ON DELETE CASCADE;
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS admission_date DATE;
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS discharge_date DATE;
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS assessment_completed BOOLEAN DEFAULT false;
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS assessment_date DATE;
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS plan_of_care_created BOOLEAN DEFAULT false;
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS plan_of_care_date DATE;
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS plan_of_care_current BOOLEAN DEFAULT false;
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS last_plan_review_date DATE;
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS visit_notes_filed_on_time BOOLEAN DEFAULT false;
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS last_visit_note_date DATE;
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS advance_directive_on_file BOOLEAN DEFAULT false;
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS polst_form_on_file BOOLEAN DEFAULT false;
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS medication_list_current BOOLEAN DEFAULT false;
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS client_rights_provided BOOLEAN DEFAULT false;
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS discharge_notice_provided BOOLEAN DEFAULT false;
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS discharge_notice_date DATE;
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS discharge_summary_complete BOOLEAN DEFAULT false;
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS alternative_services_provided BOOLEAN DEFAULT false;
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS documentation_status TEXT DEFAULT 'gaps' CHECK (documentation_status IN ('complete','mostly_complete','gaps','critical_gaps'));
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS missing_documentation TEXT[] DEFAULT '{}';
ALTER TABLE client_documentation ADD COLUMN IF NOT EXISTS last_audited_date DATE;

-- ── COMPLAINTS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS facility_id UUID;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS complaint_date DATE;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS complaint_description TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS filed_by TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS filed_by_relationship TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS investigation_start_date DATE;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS investigation_findings TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolution_description TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolved_date DATE;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS doh_notification_required BOOLEAN DEFAULT false;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS doh_reported_date DATE;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS doh_case_number TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open' CHECK (status IN ('open','under_investigation','resolved','closed'));
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS follow_up_needed BOOLEAN DEFAULT false;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS follow_up_date DATE;

-- ── QIP METRICS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qip_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE qip_metrics ADD COLUMN IF NOT EXISTS facility_id UUID;
ALTER TABLE qip_metrics ADD COLUMN IF NOT EXISTS metric_type TEXT;
ALTER TABLE qip_metrics ADD COLUMN IF NOT EXISTS metric_name TEXT;
ALTER TABLE qip_metrics ADD COLUMN IF NOT EXISTS target_value NUMERIC DEFAULT 100;
ALTER TABLE qip_metrics ADD COLUMN IF NOT EXISTS actual_value NUMERIC DEFAULT 0;
ALTER TABLE qip_metrics ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'percent' CHECK (unit IN ('percent','count','days'));
ALTER TABLE qip_metrics ADD COLUMN IF NOT EXISTS reporting_period DATE;
ALTER TABLE qip_metrics ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'at_risk' CHECK (status IN ('meets_target','below_target','at_risk'));
ALTER TABLE qip_metrics ADD COLUMN IF NOT EXISTS trend TEXT CHECK (trend IN ('improving','declining','stable'));
ALTER TABLE qip_metrics ADD COLUMN IF NOT EXISTS issues TEXT[] DEFAULT '{}';
ALTER TABLE qip_metrics ADD COLUMN IF NOT EXISTS actions_taken TEXT[] DEFAULT '{}';

-- ── SURVEY READINESS CHECKLIST ────────────────────────────────────
CREATE TABLE IF NOT EXISTS survey_readiness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE survey_readiness ADD COLUMN IF NOT EXISTS facility_id UUID;
ALTER TABLE survey_readiness ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE survey_readiness ADD COLUMN IF NOT EXISTS item_description TEXT;
ALTER TABLE survey_readiness ADD COLUMN IF NOT EXISTS wac_reference TEXT;
ALTER TABLE survey_readiness ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT false;
ALTER TABLE survey_readiness ADD COLUMN IF NOT EXISTS completed_date DATE;
ALTER TABLE survey_readiness ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE survey_readiness ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE survey_readiness ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'high' CHECK (priority IN ('critical','high','medium','low'));

-- ── ENABLE RLS ────────────────────────────────────────────────────
ALTER TABLE personnel_compliance  ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_checks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_assessments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_documentation  ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints            ENABLE ROW LEVEL SECURITY;
ALTER TABLE qip_metrics           ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_readiness      ENABLE ROW LEVEL SECURITY;

-- ── RLS POLICIES ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenant_personnel_compliance" ON personnel_compliance;
DROP POLICY IF EXISTS "tenant_background_checks"    ON background_checks;
DROP POLICY IF EXISTS "tenant_tb_assessments"       ON tb_assessments;
DROP POLICY IF EXISTS "tenant_training_records"     ON training_records;
DROP POLICY IF EXISTS "tenant_client_documentation" ON client_documentation;
DROP POLICY IF EXISTS "tenant_complaints"           ON complaints;
DROP POLICY IF EXISTS "tenant_qip_metrics"          ON qip_metrics;
DROP POLICY IF EXISTS "tenant_survey_readiness"     ON survey_readiness;

CREATE POLICY "tenant_personnel_compliance" ON personnel_compliance FOR ALL USING (facility_id = get_my_facility_id());
CREATE POLICY "tenant_background_checks"    ON background_checks    FOR ALL USING (facility_id = get_my_facility_id());
CREATE POLICY "tenant_tb_assessments"       ON tb_assessments       FOR ALL USING (facility_id = get_my_facility_id());
CREATE POLICY "tenant_training_records"     ON training_records     FOR ALL USING (facility_id = get_my_facility_id());
CREATE POLICY "tenant_client_documentation" ON client_documentation FOR ALL USING (facility_id = get_my_facility_id());
CREATE POLICY "tenant_complaints"           ON complaints           FOR ALL USING (facility_id = get_my_facility_id());
CREATE POLICY "tenant_qip_metrics"          ON qip_metrics          FOR ALL USING (facility_id = get_my_facility_id());
CREATE POLICY "tenant_survey_readiness"     ON survey_readiness     FOR ALL USING (facility_id = get_my_facility_id());

-- ── SEED: Default survey readiness checklist (WAC 246-335) ────────
-- (Runs once; skipped if items already exist for this placeholder)
INSERT INTO survey_readiness (facility_id, category, item_description, wac_reference, priority)
SELECT '00000000-0000-0000-0000-000000000000', category, item, ref, pri
FROM (VALUES
  ('Personnel Files',        'Criminal background check on file (initial + 2-yr renewal)',         'WAC 246-335-085',  'critical'),
  ('Personnel Files',        'TB risk assessment on file (initial + annual)',                       'WAC 246-335-083',  'critical'),
  ('Personnel Files',        'Orientation training documentation complete',                        'WAC 246-335-080',  'high'),
  ('Personnel Files',        'Annual in-service training documented (5+ hrs)',                     'WAC 246-335-080',  'high'),
  ('Personnel Files',        'Infection control training on file',                                 'WAC 246-335-080',  'high'),
  ('Personnel Files',        'Bloodborne pathogen training on file',                               'WAC 246-335-080',  'high'),
  ('Personnel Files',        'Mandatory reporter training documented',                             'WAC 246-335-080',  'high'),
  ('Personnel Files',        'Emergency preparedness training documented',                         'WAC 246-335-070',  'medium'),
  ('Personnel Files',        'Performance evaluations completed annually',                         'WAC 246-335-080',  'medium'),
  ('Personnel Files',        'Professional licenses verified and current',                         'WAC 246-335-082',  'critical'),
  ('Client Records',         'Initial assessment completed within required timeframe',             'WAC 246-335-055',  'critical'),
  ('Client Records',         'Plan of care created and signed',                                    'WAC 246-335-055',  'critical'),
  ('Client Records',         'Plan of care reviewed within 60 days',                               'WAC 246-335-055',  'critical'),
  ('Client Records',         'Visit notes filed within 7 days',                                    'WAC 246-335-065',  'high'),
  ('Client Records',         'Advance directive documentation on file',                            'WAC 246-335-055',  'high'),
  ('Client Records',         'Current medication list on file',                                    'WAC 246-335-055',  'high'),
  ('Client Records',         'Client rights notice provided and documented',                       'WAC 246-335-045',  'critical'),
  ('Policies & Procedures',  'Infection control policy current and accessible',                    'WAC 246-335-075',  'critical'),
  ('Policies & Procedures',  'Emergency preparedness plan current',                                'WAC 246-335-070',  'critical'),
  ('Policies & Procedures',  'Complaint resolution policy posted',                                 'WAC 246-335-045',  'high'),
  ('Policies & Procedures',  'Mandatory reporting procedures documented',                          'WAC 246-335-045',  'critical'),
  ('Agency Administration',  'Agency license current and posted',                                  'WAC 246-335-010',  'critical'),
  ('Agency Administration',  'Administrator qualifications verified',                              'WAC 246-335-020',  'critical'),
  ('Agency Administration',  'Supervisory structure documented',                                   'WAC 246-335-020',  'high'),
  ('Quality Improvement',    'QIP program documented with measurable goals',                       'WAC 246-335-030',  'high'),
  ('Quality Improvement',    'QIP metrics tracked and reported quarterly',                         'WAC 246-335-030',  'high'),
  ('Quality Improvement',    'Complaint log maintained with resolution tracking',                  'WAC 246-335-045',  'high')
) AS t(category, item, ref, pri)
WHERE NOT EXISTS (SELECT 1 FROM survey_readiness WHERE item_description = t.item LIMIT 1);

-- ================================================================
-- DONE. Washington State compliance module tables ready.
-- ================================================================
