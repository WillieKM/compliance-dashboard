// Washington State WAC 246-335 Compliance Types

export type ComplianceStatus = 'compliant' | 'at_risk' | 'non_compliant';
export type BgCheckResult   = 'clear' | 'issues' | 'pending';
export type TbResult        = 'negative' | 'positive' | 'not_tested';
export type DocumentStatus  = 'complete' | 'mostly_complete' | 'gaps' | 'critical_gaps';
export type ComplaintStatus = 'open' | 'under_investigation' | 'resolved' | 'closed';
export type MetricStatus    = 'meets_target' | 'below_target' | 'at_risk';
export type MetricTrend     = 'improving' | 'declining' | 'stable';
export type UserRole        = 'administrator' | 'supervisor' | 'coordinator' | 'read_only';

export type TrainingType =
  | 'orientation'
  | 'infection_control'
  | 'bloodborne_pathogen'
  | 'tb'
  | 'mandatory_reporter'
  | 'emergency_preparedness'
  | 'food_safety'
  | 'client_specific'
  | 'annual_inservice'
  | 'other';

// ── Personnel / Personnel Compliance ──────────────────────────────────────────

export interface PersonnelCompliance {
  id: string;
  facility_id: string;
  staff_id: string;
  employee_name: string;
  position: string;
  hire_date: string;

  // Background Checks (WAC 246-335-085)
  bg_check_initial_date: string | null;
  bg_check_initial_result: BgCheckResult | null;
  bg_check_renewal_due: string | null;
  bg_check_renewal_date: string | null;
  bg_check_renewal_result: BgCheckResult | null;

  // TB Risk Assessments (WAC 246-335-083)
  tb_assessment_initial_date: string | null;
  tb_assessment_initial_result: TbResult | null;
  tb_assessment_annual_due: string | null;
  tb_assessment_last_date: string | null;
  tb_assessment_last_result: TbResult | null;

  // License / Credentials
  license_type: string | null;
  license_number: string | null;
  license_expiration_date: string | null;
  license_current: boolean;

  // Training (WAC 246-335-080)
  orientation_complete_date: string | null;
  infection_control_training_date: string | null;
  bloodborne_pathogen_training_date: string | null;
  tb_training_date: string | null;
  mandatory_reporter_training_date: string | null;
  emergency_preparedness_training_date: string | null;
  annual_training_due_date: string | null;

  // Performance Evaluation
  last_performance_eval_date: string | null;
  performance_eval_due_date: string | null;

  // Compliance Status
  compliance_status: ComplianceStatus;
  missing_documents: string[];
  expiring_documents: string[];
  documentation_notes: string | null;
  last_audited_date: string | null;

  created_at: string;
  updated_at: string;
}

// ── Background Check ───────────────────────────────────────────────────────────

export interface BackgroundCheck {
  id: string;
  facility_id: string;
  staff_id: string;
  employee_name: string;
  check_type: 'initial_dshs' | 'renewal_wsp' | 'renewal_dshs';
  submitted_date: string;
  result_date: string | null;
  result: BgCheckResult | null;
  next_due_date: string | null;
  notes: string | null;
  created_at: string;
}

// ── TB Assessment ──────────────────────────────────────────────────────────────

export interface TbAssessment {
  id: string;
  facility_id: string;
  staff_id: string;
  employee_name: string;
  assessment_type: 'initial' | 'annual';
  assessment_date: string;
  result: TbResult;
  tested_by: string | null;
  next_due_date: string;
  risk_factors: string | null;
  notes: string | null;
  created_at: string;
}

// ── Training Record ────────────────────────────────────────────────────────────

export interface TrainingRecord {
  id: string;
  facility_id: string;
  staff_id: string;
  employee_name: string;
  training_type: TrainingType;
  training_date: string;
  training_topic: string;
  provider: string | null;
  duration_minutes: number | null;
  certification_number: string | null;
  certification_expiration: string | null;
  notes: string | null;
  created_at: string;
}

// ── Client Documentation ───────────────────────────────────────────────────────

export interface ClientDocumentation {
  id: string;
  facility_id: string;
  resident_id: string;
  client_name: string;
  admission_date: string;
  discharge_date: string | null;

  // Required Documentation
  assessment_completed: boolean;
  assessment_date: string | null;
  plan_of_care_created: boolean;
  plan_of_care_date: string | null;
  plan_of_care_current: boolean;
  last_plan_review_date: string | null;

  // Visit Records
  visit_notes_filed_on_time: boolean;
  last_visit_note_date: string | null;

  // Rights & Legal
  advance_directive_on_file: boolean;
  polst_form_on_file: boolean;
  medication_list_current: boolean;
  client_rights_provided: boolean;

  // Discharge
  discharge_notice_provided: boolean;
  discharge_notice_date: string | null;
  discharge_summary_complete: boolean;
  alternative_services_provided: boolean;

  documentation_status: DocumentStatus;
  missing_documentation: string[];
  last_audited_date: string | null;

  created_at: string;
  updated_at: string;
}

// ── Complaint ──────────────────────────────────────────────────────────────────

export interface ComplaintRecord {
  id: string;
  facility_id: string;
  client_name: string;
  complaint_date: string;
  complaint_description: string;
  filed_by: string;
  filed_by_relationship: string;

  investigation_start_date: string | null;
  investigation_findings: string | null;
  resolution_description: string | null;
  resolved_date: string | null;

  doh_notification_required: boolean;
  doh_reported_date: string | null;
  doh_case_number: string | null;

  status: ComplaintStatus;
  follow_up_needed: boolean;
  follow_up_date: string | null;

  created_at: string;
  updated_at: string;
}

// ── Quality Improvement ────────────────────────────────────────────────────────

export interface QipMetric {
  id: string;
  facility_id: string;
  metric_type: string;
  metric_name: string;
  target_value: number;
  actual_value: number;
  unit: 'percent' | 'count' | 'days';
  reporting_period: string;
  status: MetricStatus;
  trend: MetricTrend | null;
  issues: string[];
  actions_taken: string[];
  created_at: string;
  updated_at: string;
}

// ── Survey Readiness ───────────────────────────────────────────────────────────

export interface SurveyReadinessItem {
  id: string;
  facility_id: string;
  category: string;
  item_description: string;
  wac_reference: string | null;
  is_complete: boolean;
  completed_date: string | null;
  completed_by: string | null;
  notes: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  created_at: string;
  updated_at: string;
}

// ── Dashboard Summary ──────────────────────────────────────────────────────────

export interface WaComplianceSummary {
  personnelCompliant: number;
  personnelAtRisk: number;
  personnelNonCompliant: number;
  totalPersonnel: number;
  bgChecksOverdue: number;
  bgChecksDueSoon: number;       // within 60 days
  tbAssessmentsOverdue: number;
  tbAssessmentsDueSoon: number;  // within 30 days
  trainingOverdue: number;
  openComplaints: number;
  clientDocsGaps: number;
  surveyReadinessPercent: number;
}
