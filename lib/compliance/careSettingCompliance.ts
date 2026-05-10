// Regulatory compliance configurations for all 4 Washington State care settings

export interface ChecklistItem {
  category: string;
  item: string;
  wac: string;
  priority: "critical" | "high" | "medium" | "low";
}

export interface ComplianceSetting {
  id: string;
  slug: string;
  label: string;
  shortLabel: string;
  color: string;
  headerBg: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  primaryRegulation: string;
  regulatoryBody: string;
  surveyChecklist: ChecklistItem[];
  keyRequirements: string[];
  personnelRoles: string[];
}

// ── HOME CARE (WAC 246-335) ───────────────────────────────────────────────────
const HOME_CARE_CHECKLIST: ChecklistItem[] = [
  { category: "Personnel Files",       item: "Criminal background check on file (initial DSHS + 2-yr WSP renewal)",  wac: "WAC 246-335-085", priority: "critical" },
  { category: "Personnel Files",       item: "TB risk assessment on file (initial + annual)",                        wac: "WAC 246-335-083", priority: "critical" },
  { category: "Personnel Files",       item: "Orientation training documentation complete",                          wac: "WAC 246-335-080", priority: "high" },
  { category: "Personnel Files",       item: "Annual in-service training documented (minimum 5 hours)",              wac: "WAC 246-335-080", priority: "high" },
  { category: "Personnel Files",       item: "Infection control training on file",                                   wac: "WAC 246-335-080", priority: "high" },
  { category: "Personnel Files",       item: "Bloodborne pathogen training on file",                                 wac: "WAC 246-335-080", priority: "high" },
  { category: "Personnel Files",       item: "Mandatory reporter training documented",                               wac: "WAC 246-335-080", priority: "high" },
  { category: "Personnel Files",       item: "Emergency preparedness training documented",                           wac: "WAC 246-335-070", priority: "medium" },
  { category: "Personnel Files",       item: "Performance evaluations completed annually",                           wac: "WAC 246-335-080", priority: "medium" },
  { category: "Personnel Files",       item: "Professional licenses verified and current",                           wac: "WAC 246-335-082", priority: "critical" },
  { category: "Client Records",        item: "Initial assessment completed within required timeframe",               wac: "WAC 246-335-055", priority: "critical" },
  { category: "Client Records",        item: "Plan of care created and signed",                                      wac: "WAC 246-335-055", priority: "critical" },
  { category: "Client Records",        item: "Plan of care reviewed within 60 days",                                 wac: "WAC 246-335-055", priority: "critical" },
  { category: "Client Records",        item: "Visit notes filed within 7 days",                                      wac: "WAC 246-335-065", priority: "high" },
  { category: "Client Records",        item: "Advance directive documentation on file",                              wac: "WAC 246-335-055", priority: "high" },
  { category: "Client Records",        item: "Current medication list on file",                                      wac: "WAC 246-335-055", priority: "high" },
  { category: "Client Records",        item: "Client rights notice provided and documented",                         wac: "WAC 246-335-045", priority: "critical" },
  { category: "Policies & Procedures", item: "Infection control policy current and accessible",                      wac: "WAC 246-335-075", priority: "critical" },
  { category: "Policies & Procedures", item: "Emergency preparedness plan current",                                  wac: "WAC 246-335-070", priority: "critical" },
  { category: "Policies & Procedures", item: "Complaint resolution policy posted",                                   wac: "WAC 246-335-045", priority: "high" },
  { category: "Policies & Procedures", item: "Mandatory reporting procedures documented",                            wac: "WAC 246-335-045", priority: "critical" },
  { category: "Agency Administration", item: "Agency license current and posted",                                    wac: "WAC 246-335-010", priority: "critical" },
  { category: "Agency Administration", item: "Administrator qualifications verified",                                wac: "WAC 246-335-020", priority: "critical" },
  { category: "Agency Administration", item: "Supervisory structure documented",                                     wac: "WAC 246-335-020", priority: "high" },
  { category: "Quality Improvement",   item: "QIP program documented with measurable goals",                         wac: "WAC 246-335-030", priority: "high" },
  { category: "Quality Improvement",   item: "QIP metrics tracked and reported quarterly",                           wac: "WAC 246-335-030", priority: "high" },
  { category: "Quality Improvement",   item: "Complaint log maintained with resolution tracking",                    wac: "WAC 246-335-045", priority: "high" },
];

// ── AFH (WAC 388-76) ──────────────────────────────────────────────────────────
const AFH_CHECKLIST: ChecklistItem[] = [
  { category: "Licensing & Administration", item: "AFH license current, posted, and reflects correct capacity",               wac: "WAC 388-76-10000", priority: "critical" },
  { category: "Licensing & Administration", item: "Licensed bed capacity not exceeded",                                        wac: "WAC 388-76-10000", priority: "critical" },
  { category: "Licensing & Administration", item: "Provider/administrator qualifications verified (training + experience)",   wac: "WAC 388-76-10020", priority: "critical" },
  { category: "Licensing & Administration", item: "Manager qualifications on file (if applicable)",                           wac: "WAC 388-76-10030", priority: "high" },
  { category: "Licensing & Administration", item: "Liability insurance current",                                               wac: "WAC 388-76-10010", priority: "critical" },
  { category: "Personnel Files",            item: "Background check on file — all staff (DSHS BCCU initial + 2-yr renewal)",  wac: "WAC 388-76-10080", priority: "critical" },
  { category: "Personnel Files",            item: "TB risk assessment on file — initial hire and annual",                     wac: "WAC 388-76-10080", priority: "critical" },
  { category: "Personnel Files",            item: "Provider/staff orientation training complete (AFH-specific)",              wac: "WAC 388-76-10130", priority: "critical" },
  { category: "Personnel Files",            item: "Food handler permit on file (all staff handling food)",                    wac: "WAC 388-76-10080", priority: "high" },
  { category: "Personnel Files",            item: "First aid & CPR certification current",                                    wac: "WAC 388-76-10080", priority: "critical" },
  { category: "Personnel Files",            item: "Bloodborne pathogen training documented",                                  wac: "WAC 388-76-10130", priority: "high" },
  { category: "Personnel Files",            item: "Mandatory reporter training documented",                                   wac: "WAC 388-76-10130", priority: "high" },
  { category: "Personnel Files",            item: "Annual continuing education documented (10+ hours)",                       wac: "WAC 388-76-10130", priority: "high" },
  { category: "Resident Records",           item: "Admission agreement signed (within 7 days of admission)",                 wac: "WAC 388-76-10400", priority: "critical" },
  { category: "Resident Records",           item: "Individual Care Plan (ISP) completed within 30 days",                     wac: "WAC 388-76-10415", priority: "critical" },
  { category: "Resident Records",           item: "Care plan reviewed at least every 6 months or upon condition change",     wac: "WAC 388-76-10415", priority: "critical" },
  { category: "Resident Records",           item: "Medication Administration Record (MAR) current and complete",             wac: "WAC 388-76-10530", priority: "critical" },
  { category: "Resident Records",           item: "Resident rights notice provided and documented",                          wac: "WAC 388-76-10355", priority: "critical" },
  { category: "Resident Records",           item: "Financial records and personal funds documented (if managed by AFH)",     wac: "WAC 388-76-10390", priority: "high" },
  { category: "Resident Records",           item: "Advance directive on file (if applicable)",                               wac: "WAC 388-76-10400", priority: "high" },
  { category: "Medication Management",      item: "Medication storage locked and properly labeled",                          wac: "WAC 388-76-10520", priority: "critical" },
  { category: "Medication Management",      item: "Controlled substance log current and reconciled",                         wac: "WAC 388-76-10540", priority: "critical" },
  { category: "Medication Management",      item: "Provider/staff authorized to assist with medications",                    wac: "WAC 388-76-10530", priority: "critical" },
  { category: "Safety & Environment",       item: "Annual fire safety inspection complete and documented",                   wac: "WAC 388-76-10660", priority: "critical" },
  { category: "Safety & Environment",       item: "Monthly fire drills conducted and documented",                            wac: "WAC 388-76-10660", priority: "high" },
  { category: "Safety & Environment",       item: "Emergency preparedness plan current and practiced",                       wac: "WAC 388-76-10690", priority: "critical" },
  { category: "Safety & Environment",       item: "Carbon monoxide and smoke detectors tested monthly",                      wac: "WAC 388-76-10660", priority: "high" },
  { category: "Safety & Environment",       item: "Water temperature set at or below 120°F documented",                     wac: "WAC 388-76-10640", priority: "high" },
  { category: "Policies & Procedures",      item: "Incident/accident reporting procedures in place (24-hr DOH notification)", wac: "WAC 388-76-10350", priority: "critical" },
  { category: "Policies & Procedures",      item: "Grievance/complaint policy posted and accessible to residents",           wac: "WAC 388-76-10355", priority: "high" },
  { category: "Policies & Procedures",      item: "Abuse, neglect, exploitation policy documented",                          wac: "WAC 388-76-10345", priority: "critical" },
  { category: "Nutrition & Food Service",   item: "Planned menus meeting nutritional requirements",                          wac: "WAC 388-76-10580", priority: "high" },
  { category: "Nutrition & Food Service",   item: "Food storage and handling practices meet health code",                    wac: "WAC 388-76-10580", priority: "high" },
  { category: "Quality Improvement",        item: "Discharge planning documented when applicable",                           wac: "WAC 388-76-10410", priority: "high" },
];

// ── ASSISTED LIVING (WAC 388-78A) ─────────────────────────────────────────────
const ASSISTED_LIVING_CHECKLIST: ChecklistItem[] = [
  { category: "Licensing & Administration", item: "Assisted living facility license current and posted",                     wac: "WAC 388-78A-2000", priority: "critical" },
  { category: "Licensing & Administration", item: "Licensed capacity not exceeded",                                          wac: "WAC 388-78A-2000", priority: "critical" },
  { category: "Licensing & Administration", item: "Administrator license current (NAB licensed or state equivalent)",        wac: "WAC 388-78A-2100", priority: "critical" },
  { category: "Licensing & Administration", item: "Organizational chart current and posted",                                 wac: "WAC 388-78A-2100", priority: "medium" },
  { category: "Personnel Files",            item: "Background check on file — all staff (DSHS + 2-yr renewal)",             wac: "WAC 388-78A-2270", priority: "critical" },
  { category: "Personnel Files",            item: "TB risk assessment on file — initial + annual",                          wac: "WAC 388-78A-2270", priority: "critical" },
  { category: "Personnel Files",            item: "Initial training complete (70+ hours for direct care staff)",             wac: "WAC 388-78A-2310", priority: "critical" },
  { category: "Personnel Files",            item: "Annual continuing education documented (12+ hours)",                      wac: "WAC 388-78A-2310", priority: "high" },
  { category: "Personnel Files",            item: "Dementia care training documented (for memory care units)",               wac: "WAC 388-78A-2320", priority: "high" },
  { category: "Personnel Files",            item: "Medication management training for delegating nurses",                    wac: "WAC 388-78A-2340", priority: "critical" },
  { category: "Personnel Files",            item: "CPR/First aid certification current (designated staff)",                  wac: "WAC 388-78A-2270", priority: "high" },
  { category: "Personnel Files",            item: "Mandatory reporter training documented",                                  wac: "WAC 388-78A-2310", priority: "high" },
  { category: "Personnel Files",            item: "Bloodborne pathogen training documented",                                 wac: "WAC 388-78A-2310", priority: "high" },
  { category: "Resident Records",           item: "Pre-admission screening completed",                                       wac: "WAC 388-78A-2150", priority: "critical" },
  { category: "Resident Records",           item: "Resident assessment completed within 14 days of admission",              wac: "WAC 388-78A-2160", priority: "critical" },
  { category: "Resident Records",           item: "Individual Service Plan (ISP) completed within 30 days",                 wac: "WAC 388-78A-2170", priority: "critical" },
  { category: "Resident Records",           item: "ISP reviewed and updated at least annually (or upon change)",            wac: "WAC 388-78A-2170", priority: "critical" },
  { category: "Resident Records",           item: "Medication Administration Record (MAR) current",                         wac: "WAC 388-78A-2240", priority: "critical" },
  { category: "Resident Records",           item: "Resident rights notice provided, explained, and documented",             wac: "WAC 388-78A-3350", priority: "critical" },
  { category: "Resident Records",           item: "Disclosure statement provided to resident/family",                       wac: "WAC 388-78A-3330", priority: "critical" },
  { category: "Resident Records",           item: "Advance directive on file",                                              wac: "WAC 388-78A-2175", priority: "high" },
  { category: "Resident Records",           item: "Residency agreement signed",                                             wac: "WAC 388-78A-3340", priority: "critical" },
  { category: "Medication Management",      item: "Medication storage, handling, and disposal protocol followed",           wac: "WAC 388-78A-2230", priority: "critical" },
  { category: "Medication Management",      item: "Registered nurse delegation in place for medication assistance",         wac: "WAC 388-78A-2240", priority: "critical" },
  { category: "Medication Management",      item: "Controlled substance tracking and reconciliation current",               wac: "WAC 388-78A-2230", priority: "critical" },
  { category: "Safety & Environment",       item: "Annual fire safety inspection complete and documented",                  wac: "WAC 388-78A-2700", priority: "critical" },
  { category: "Safety & Environment",       item: "Fire and disaster drills conducted quarterly and documented",            wac: "WAC 388-78A-2700", priority: "high" },
  { category: "Safety & Environment",       item: "Emergency preparedness and disaster plan current",                       wac: "WAC 388-78A-2710", priority: "critical" },
  { category: "Safety & Environment",       item: "Fall prevention program documented",                                     wac: "WAC 388-78A-2600", priority: "high" },
  { category: "Safety & Environment",       item: "Infection control program current",                                      wac: "WAC 388-78A-2620", priority: "critical" },
  { category: "Services",                   item: "Activities program documented and offered to all residents",             wac: "WAC 388-78A-2520", priority: "high" },
  { category: "Services",                   item: "Nutritional assessment and meal plan per resident needs",                wac: "WAC 388-78A-2530", priority: "high" },
  { category: "Services",                   item: "Transportation services documented (if provided)",                       wac: "WAC 388-78A-2560", priority: "medium" },
  { category: "Policies & Procedures",      item: "Abuse, neglect, exploitation policy and reporting procedures",          wac: "WAC 388-78A-3300", priority: "critical" },
  { category: "Policies & Procedures",      item: "Grievance policy posted and accessible",                                 wac: "WAC 388-78A-3360", priority: "high" },
  { category: "Policies & Procedures",      item: "Restraint policy documented (if restraints are used)",                  wac: "WAC 388-78A-3420", priority: "high" },
  { category: "Quality Improvement",        item: "QA program with written goals and tracking",                             wac: "WAC 388-78A-2460", priority: "high" },
  { category: "Quality Improvement",        item: "Resident/family satisfaction survey conducted annually",                 wac: "WAC 388-78A-2460", priority: "medium" },
];

// ── MULTI-SERVICE (Multiple WACs) ─────────────────────────────────────────────
const MULTI_SERVICE_CHECKLIST: ChecklistItem[] = [
  { category: "Agency Licensing",       item: "All applicable licenses current for each service line",                    wac: "Multiple WACs",    priority: "critical" },
  { category: "Agency Licensing",       item: "Agency license reflects all services provided",                            wac: "Multiple WACs",    priority: "critical" },
  { category: "Agency Licensing",       item: "Separate oversight structure for each licensed service",                   wac: "Multiple WACs",    priority: "high" },
  { category: "Personnel Files",        item: "Background checks on file (all staff across all service lines)",           wac: "WAC 388-76 / 246-335", priority: "critical" },
  { category: "Personnel Files",        item: "TB assessments current for all staff",                                     wac: "WAC 388-76 / 246-335", priority: "critical" },
  { category: "Personnel Files",        item: "Service-line-specific training documented per program",                    wac: "Multiple WACs",    priority: "critical" },
  { category: "Personnel Files",        item: "Food handler permits (staff providing food services)",                     wac: "WAC 388-76",       priority: "high" },
  { category: "Personnel Files",        item: "CPR/First aid current",                                                    wac: "Multiple WACs",    priority: "high" },
  { category: "Personnel Files",        item: "Mandatory reporter training all staff",                                    wac: "Multiple WACs",    priority: "high" },
  { category: "Client Records",         item: "Service-line-appropriate assessment for each client",                      wac: "Multiple WACs",    priority: "critical" },
  { category: "Client Records",         item: "Program-specific plan of care / ISP for each client",                     wac: "Multiple WACs",    priority: "critical" },
  { category: "Client Records",         item: "Client rights notice provided per applicable regulation",                  wac: "Multiple WACs",    priority: "critical" },
  { category: "Client Records",         item: "Documentation matches service type provided",                              wac: "Multiple WACs",    priority: "high" },
  { category: "Client Records",         item: "Medication records current where applicable",                              wac: "Multiple WACs",    priority: "critical" },
  { category: "Safety",                 item: "Emergency preparedness plan covers all service lines",                     wac: "Multiple WACs",    priority: "critical" },
  { category: "Safety",                 item: "Fire safety compliance documented for each location",                      wac: "Multiple WACs",    priority: "critical" },
  { category: "Safety",                 item: "Infection control program applicable to all services",                     wac: "Multiple WACs",    priority: "high" },
  { category: "Policies & Procedures",  item: "Policies specific to each program type",                                   wac: "Multiple WACs",    priority: "high" },
  { category: "Policies & Procedures",  item: "Complaint/grievance policy for each service",                              wac: "Multiple WACs",    priority: "high" },
  { category: "Policies & Procedures",  item: "Abuse/neglect policy covers all client populations",                       wac: "Multiple WACs",    priority: "critical" },
  { category: "Quality Improvement",    item: "QIP tracks metrics across all service lines",                              wac: "Multiple WACs",    priority: "high" },
  { category: "Quality Improvement",    item: "Cross-service incident reporting and trending",                            wac: "Multiple WACs",    priority: "high" },
];

// ── EXPORTED SETTINGS MAP ─────────────────────────────────────────────────────

export const COMPLIANCE_SETTINGS: Record<string, ComplianceSetting> = {
  "home-care": {
    id: "home-care",
    slug: "home-care",
    label: "Home Care Agency",
    shortLabel: "Home Care",
    color: "blue",
    headerBg: "linear-gradient(135deg, #1a3a52, #274f6e)",
    accentBg: "bg-blue-50",
    accentText: "text-blue-800",
    accentBorder: "border-blue-200",
    primaryRegulation: "WAC 246-335",
    regulatoryBody: "WA State Dept. of Health (DOH)",
    surveyChecklist: HOME_CARE_CHECKLIST,
    keyRequirements: [
      "Background check every 2 years (DSHS/WSP)",
      "Annual TB risk assessment",
      "5+ hours annual in-service training",
      "Plan of care within required timeframe",
      "Visit notes filed within 7 days",
    ],
    personnelRoles: ["RN", "LPN", "HCA", "CNA", "PT", "OT", "SLP", "MSW"],
  },
  "afh": {
    id: "afh",
    slug: "afh",
    label: "Adult Family Home",
    shortLabel: "AFH",
    color: "amber",
    headerBg: "linear-gradient(135deg, #92400e, #b45309)",
    accentBg: "bg-amber-50",
    accentText: "text-amber-800",
    accentBorder: "border-amber-200",
    primaryRegulation: "WAC 388-76",
    regulatoryBody: "WA DSHS Residential Care Services",
    surveyChecklist: AFH_CHECKLIST,
    keyRequirements: [
      "Background check every 2 years (DSHS BCCU)",
      "Food handler permit required",
      "CPR/First aid current at all times",
      "Care plan within 30 days of admission",
      "Monthly fire drills documented",
      "10+ hours continuing education annually",
    ],
    personnelRoles: ["AFH Provider", "AFH Manager", "Caregiver", "RN", "Medication Aide"],
  },
  "assisted-living": {
    id: "assisted-living",
    slug: "assisted-living",
    label: "Assisted Living Facility",
    shortLabel: "Assisted Living",
    color: "purple",
    headerBg: "linear-gradient(135deg, #4c1d95, #6d28d9)",
    accentBg: "bg-purple-50",
    accentText: "text-purple-800",
    accentBorder: "border-purple-200",
    primaryRegulation: "WAC 388-78A",
    regulatoryBody: "WA DSHS Residential Care Services",
    surveyChecklist: ASSISTED_LIVING_CHECKLIST,
    keyRequirements: [
      "Administrator must hold NAB license",
      "70+ hours initial training (direct care)",
      "12+ hours annual continuing education",
      "ISP within 30 days of admission",
      "RN delegation for medication management",
      "Quarterly fire and disaster drills",
    ],
    personnelRoles: ["Administrator", "RN", "LPN", "Medication Aide", "Direct Care Worker", "Activities Director", "Social Worker"],
  },
  "multi-service": {
    id: "multi-service",
    slug: "multi-service",
    label: "Multi-Service Agency",
    shortLabel: "Multi-Service",
    color: "teal",
    headerBg: "linear-gradient(135deg, #134e4a, #0f766e)",
    accentBg: "bg-teal-50",
    accentText: "text-teal-800",
    accentBorder: "border-teal-200",
    primaryRegulation: "Multiple WACs",
    regulatoryBody: "WA DOH + DSHS",
    surveyChecklist: MULTI_SERVICE_CHECKLIST,
    keyRequirements: [
      "Separate license for each service line",
      "Service-line-specific training per program",
      "Cross-service QIP tracking",
      "Regulation applies per service type",
      "Unified complaint process for all services",
    ],
    personnelRoles: ["Administrator", "Program Director", "RN", "Caregiver", "HCA", "Case Manager"],
  },
};

export const ALL_COMPLIANCE_SETTINGS = Object.values(COMPLIANCE_SETTINGS);
