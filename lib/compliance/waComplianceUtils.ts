import type { PersonnelCompliance, ComplianceStatus } from "@/lib/types/wa-compliance";

export const WA_COLORS = {
  navy:           "#1a3a52",
  navyLight:      "#274f6e",
  gold:           "#d4a574",
  goldLight:      "#e8c9a0",
  compliant:      "#10b981",
  atRisk:         "#f59e0b",
  nonCompliant:   "#ef4444",
  background:     "#f9fafb",
};

// ── Date helpers ───────────────────────────────────────────────────────────────

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export function isOverdue(dateStr: string | null): boolean {
  const d = daysUntil(dateStr);
  return d !== null && d < 0;
}

export function isDueSoon(dateStr: string | null, withinDays = 30): boolean {
  const d = daysUntil(dateStr);
  return d !== null && d >= 0 && d <= withinDays;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function dueDateLabel(dateStr: string | null): string {
  const d = daysUntil(dateStr);
  if (d === null) return "Not set";
  if (d < 0)  return `${Math.abs(d)}d overdue`;
  if (d === 0) return "Due today";
  if (d <= 7)  return `${d}d left`;
  if (d <= 30) return `${d}d left`;
  return formatDate(dateStr);
}

// ── Status helpers ─────────────────────────────────────────────────────────────

export function statusColor(status: ComplianceStatus): string {
  if (status === "compliant")     return WA_COLORS.compliant;
  if (status === "at_risk")       return WA_COLORS.atRisk;
  return WA_COLORS.nonCompliant;
}

export function statusBgClass(status: ComplianceStatus): string {
  if (status === "compliant")     return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "at_risk")       return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

export function statusLabel(status: ComplianceStatus): string {
  if (status === "compliant")     return "✓ Compliant";
  if (status === "at_risk")       return "⚠ At Risk";
  return "✕ Non-Compliant";
}

export function dueDateBadge(dateStr: string | null, warnAt = 60): string {
  const d = daysUntil(dateStr);
  if (d === null) return "bg-slate-100 text-slate-500";
  if (d < 0)          return "bg-red-100 text-red-700";
  if (d <= 14)        return "bg-red-100 text-red-700";
  if (d <= 30)        return "bg-amber-100 text-amber-700";
  if (d <= warnAt)    return "bg-yellow-100 text-yellow-700";
  return "bg-emerald-100 text-emerald-700";
}

// ── Calculate overall personnel compliance status ──────────────────────────────

export function calcPersonnelStatus(p: Partial<PersonnelCompliance>): ComplianceStatus {
  const today = new Date().toISOString().split("T")[0];

  // Critical failures → non_compliant
  if (p.bg_check_renewal_due && p.bg_check_renewal_due < today) return "non_compliant";
  if (p.bg_check_initial_result === "issues") return "non_compliant";
  if (p.tb_assessment_annual_due && p.tb_assessment_annual_due < today) return "non_compliant";
  if (p.license_expiration_date && p.license_expiration_date < today) return "non_compliant";
  if (p.annual_training_due_date && p.annual_training_due_date < today) return "non_compliant";

  // Upcoming warnings → at_risk
  const bgDays = daysUntil(p.bg_check_renewal_due ?? null);
  if (bgDays !== null && bgDays <= 60) return "at_risk";

  const tbDays = daysUntil(p.tb_assessment_annual_due ?? null);
  if (tbDays !== null && tbDays <= 30) return "at_risk";

  const trainDays = daysUntil(p.annual_training_due_date ?? null);
  if (trainDays !== null && trainDays <= 30) return "at_risk";

  const licenseDays = daysUntil(p.license_expiration_date ?? null);
  if (licenseDays !== null && licenseDays <= 60) return "at_risk";

  return "compliant";
}

// ── Build list of missing/expiring documents for a personnel record ────────────

export function getMissingDocuments(p: Partial<PersonnelCompliance>): string[] {
  const missing: string[] = [];
  if (!p.bg_check_initial_date)              missing.push("Initial background check");
  if (!p.tb_assessment_initial_date)         missing.push("Initial TB assessment");
  if (!p.orientation_complete_date)          missing.push("Orientation training");
  if (!p.infection_control_training_date)    missing.push("Infection control training");
  if (!p.bloodborne_pathogen_training_date)  missing.push("Bloodborne pathogen training");
  if (!p.mandatory_reporter_training_date)   missing.push("Mandatory reporter training");
  if (!p.emergency_preparedness_training_date) missing.push("Emergency preparedness training");
  return missing;
}

export function getExpiringDocuments(p: Partial<PersonnelCompliance>): string[] {
  const expiring: string[] = [];
  if (isDueSoon(p.bg_check_renewal_due ?? null, 60))     expiring.push("Background check renewal");
  if (isDueSoon(p.tb_assessment_annual_due ?? null, 30)) expiring.push("Annual TB assessment");
  if (isDueSoon(p.license_expiration_date ?? null, 60))  expiring.push("Professional license");
  if (isDueSoon(p.annual_training_due_date ?? null, 30)) expiring.push("Annual training");
  if (isDueSoon(p.performance_eval_due_date ?? null, 30)) expiring.push("Performance evaluation");
  return expiring;
}

// ── File completeness score (0–100) ───────────────────────────────────────────

export function fileCompletenessScore(p: Partial<PersonnelCompliance>): number {
  const checks = [
    !!p.bg_check_initial_date,
    !!p.tb_assessment_initial_date,
    !!p.orientation_complete_date,
    !!p.infection_control_training_date,
    !!p.bloodborne_pathogen_training_date,
    !!p.mandatory_reporter_training_date,
    !!p.emergency_preparedness_training_date,
    !!p.hire_date,
    !!p.last_performance_eval_date,
    p.bg_check_initial_result === "clear",
    p.tb_assessment_initial_result === "negative",
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

// ── WAC reference links ────────────────────────────────────────────────────────

export const WAC_REFS: Record<string, string> = {
  "WAC 246-335-010": "Agency licensure requirements",
  "WAC 246-335-020": "Administrator qualifications",
  "WAC 246-335-030": "Quality improvement program",
  "WAC 246-335-045": "Client rights and complaints",
  "WAC 246-335-055": "Client assessment and plan of care",
  "WAC 246-335-065": "Visit documentation requirements",
  "WAC 246-335-070": "Emergency preparedness",
  "WAC 246-335-075": "Infection control",
  "WAC 246-335-080": "Personnel training requirements",
  "WAC 246-335-082": "Professional license verification",
  "WAC 246-335-083": "TB risk assessment requirements",
  "WAC 246-335-085": "Background check requirements",
};
