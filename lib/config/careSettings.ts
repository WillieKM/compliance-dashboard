export interface DocumentCategory {
  id: string;
  label: string;
  icon: string;
  critical: boolean;
}

export interface CareSetting {
  id: "HOME_CARE" | "AFH" | "ASSISTED_LIVING" | "MULTI_SERVICE";
  slug: string;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  headerBg: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  badgeBg: string;
  regulations: string;
  regulatoryBody: string;
  documents: DocumentCategory[];
}

export const CARE_SETTINGS: Record<string, CareSetting> = {
  HOME_CARE: {
    id: "HOME_CARE",
    slug: "home-care",
    label: "Home Care Agency",
    shortLabel: "Home Care",
    description: "Medicare/Medicaid certified home health services",
    color: "blue",
    headerBg: "from-blue-600 to-blue-700",
    accentBg: "bg-blue-50",
    accentText: "text-blue-700",
    accentBorder: "border-blue-200",
    badgeBg: "bg-blue-600",
    regulations: "CMS Conditions of Participation (42 CFR Part 484)",
    regulatoryBody: "Centers for Medicare & Medicaid Services (CMS)",
    documents: [
      { id: "oasis", label: "OASIS Assessments", icon: "📋", critical: true },
      { id: "poc", label: "Plan of Care", icon: "📄", critical: true },
      { id: "f2f", label: "Face-to-Face Encounters", icon: "👥", critical: true },
      { id: "physician_orders", label: "Physician Orders", icon: "🏥", critical: true },
      { id: "visit_notes", label: "Visit Notes", icon: "📝", critical: false },
      { id: "discharge", label: "Discharge Summaries", icon: "📤", critical: false },
    ],
  },
  AFH: {
    id: "AFH",
    slug: "afh",
    label: "Adult Family Home",
    shortLabel: "AFH",
    description: "State-licensed residential care in a family setting",
    color: "amber",
    headerBg: "from-amber-500 to-amber-600",
    accentBg: "bg-amber-50",
    accentText: "text-amber-700",
    accentBorder: "border-amber-200",
    badgeBg: "bg-amber-500",
    regulations: "State AFH Regulations (WAC 388-76)",
    regulatoryBody: "Department of Social & Health Services (DSHS)",
    documents: [
      { id: "care_plan", label: "Care Plans", icon: "🏠", critical: true },
      { id: "daily_notes", label: "Daily Notes", icon: "📓", critical: true },
      { id: "medication", label: "Medication Records", icon: "💊", critical: true },
      { id: "admission", label: "Admission Agreements", icon: "✍️", critical: true },
      { id: "incidents", label: "Incident Reports", icon: "⚠️", critical: false },
      { id: "staff_training", label: "Staff Training Records", icon: "👨‍🏫", critical: true },
    ],
  },
  ASSISTED_LIVING: {
    id: "ASSISTED_LIVING",
    slug: "assisted-living",
    label: "Assisted Living Facility",
    shortLabel: "Assisted Living",
    description: "Licensed residential facility with personal care services",
    color: "purple",
    headerBg: "from-purple-600 to-purple-700",
    accentBg: "bg-purple-50",
    accentText: "text-purple-700",
    accentBorder: "border-purple-200",
    badgeBg: "bg-purple-600",
    regulations: "State ALF Regulations & CMS Guidelines",
    regulatoryBody: "State Department of Health",
    documents: [
      { id: "isp", label: "Service Plans (ISP)", icon: "📋", critical: true },
      { id: "assessments", label: "Resident Assessments", icon: "🔍", critical: true },
      { id: "consent", label: "Consent Forms", icon: "✍️", critical: true },
      { id: "licensing", label: "Licenses & Certifications", icon: "✅", critical: true },
      { id: "daily_logs", label: "Activity Logs", icon: "📊", critical: false },
      { id: "incidents", label: "Safety & Incident Reports", icon: "🔒", critical: false },
    ],
  },
  MULTI_SERVICE: {
    id: "MULTI_SERVICE",
    slug: "multi-service",
    label: "Multi-Service Agency",
    shortLabel: "Multi-Service",
    description: "Agency providing multiple care service lines",
    color: "green",
    headerBg: "from-teal-600 to-teal-700",
    accentBg: "bg-teal-50",
    accentText: "text-teal-700",
    accentBorder: "border-teal-200",
    badgeBg: "bg-teal-600",
    regulations: "Multiple state & federal regulations apply",
    regulatoryBody: "Multiple regulatory bodies",
    documents: [
      { id: "program_plans", label: "Program Plans", icon: "📋", critical: true },
      { id: "client_records", label: "Client Records", icon: "📁", critical: true },
      { id: "staff_training", label: "Staff Training", icon: "👨‍🏫", critical: true },
      { id: "licensing", label: "Licenses & Certifications", icon: "✅", critical: true },
      { id: "progress_notes", label: "Progress Notes", icon: "📝", critical: false },
      { id: "incident_reports", label: "Incident Reports", icon: "⚠️", critical: false },
    ],
  },
};

export const ALL_CARE_SETTINGS = Object.values(CARE_SETTINGS);
