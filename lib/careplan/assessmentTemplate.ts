export interface AssessmentData {
  // Basic info
  residentName: string;
  assessmentDate: string;
  completedBy: string;
  // Health Status
  diagnoses: string;
  medications: string;
  allergies: string;
  painLevel: string;
  // ADLs
  bathing: string;
  dressing: string;
  toileting: string;
  mobility: string;
  eating: string;
  communication: string;
  // Cognitive
  memoryStatus: string;
  orientation: string;
  decisionMaking: string;
  // Behavioral
  sleepPatterns: string;
  mood: string;
  socialInteraction: string;
  behavioralConcerns: string;
  // Safety
  fallRisk: string;
  wanderingRisk: string;
  otherSafetyNeeds: string;
  // Preferences
  foodPreferences: string;
  activityPreferences: string;
  culturalReligious: string;
  visitorPreferences: string;
  // Goals
  residentGoals: string;
  familyGoals: string;
}

export interface CarePlanItem {
  need: string;
  goal: string;
  interventions: string[];
  responsibleStaff: string;
  reviewDate: string;
}

// Maps assessment answers to structured care plan items
export function buildTemplatePlan(data: AssessmentData): CarePlanItem[] {
  const items: CarePlanItem[] = [];
  const reviewDate = getReviewDate(90);

  // ── ADL: Bathing ────────────────────────────────────────────
  if (data.bathing && data.bathing !== "Independent") {
    items.push({
      need: "Bathing/Personal Hygiene",
      goal: `${data.residentName} will maintain personal hygiene with ${data.bathing.toLowerCase()} assistance within 90 days.`,
      interventions: [
        `Provide ${data.bathing.toLowerCase()} assistance with bathing daily or per preference`,
        "Use adaptive equipment as needed (grab bars, shower chair)",
        "Respect resident dignity and privacy during care",
        "Document any skin changes or concerns",
      ],
      responsibleStaff: "Direct Care Staff",
      reviewDate,
    });
  }

  // ── ADL: Dressing ───────────────────────────────────────────
  if (data.dressing && data.dressing !== "Independent") {
    items.push({
      need: "Dressing/Grooming",
      goal: `${data.residentName} will dress independently or with ${data.dressing.toLowerCase()} assistance, maintaining dignity and personal choice.`,
      interventions: [
        `Offer ${data.dressing.toLowerCase()} assistance with dressing each morning`,
        "Allow resident to choose their own clothing when possible",
        "Use adaptive clothing or devices if needed",
        "Encourage participation to maintain independence",
      ],
      responsibleStaff: "Direct Care Staff",
      reviewDate,
    });
  }

  // ── ADL: Mobility ───────────────────────────────────────────
  if (data.mobility && data.mobility !== "Independent") {
    items.push({
      need: "Mobility/Transfers",
      goal: `${data.residentName} will safely ambulate or transfer with ${data.mobility.toLowerCase()} assistance, preventing falls.`,
      interventions: [
        `Assist with transfers and ambulation — ${data.mobility.toLowerCase()} level`,
        "Ensure mobility aids (walker, wheelchair) are accessible at all times",
        "Non-slip footwear to be worn at all times",
        "Complete fall risk reassessment monthly",
        data.fallRisk === "High" ? "Implement high fall-risk protocol — bed alarm, hourly checks" : "Monitor for changes in mobility",
      ].filter(Boolean) as string[],
      responsibleStaff: "Direct Care Staff / Nurse",
      reviewDate,
    });
  }

  // ── Safety: Fall Risk ───────────────────────────────────────
  if (data.fallRisk === "High" || data.fallRisk === "Moderate") {
    items.push({
      need: "Fall Prevention",
      goal: `${data.residentName} will experience zero preventable falls during the plan period.`,
      interventions: [
        "Clear pathways and remove trip hazards from living areas",
        "Call light within reach at all times",
        "Respond to call light within 5 minutes",
        "Non-slip footwear at all times when ambulatory",
        data.fallRisk === "High" ? "Bed/chair alarm activated at night" : "Routine safety checks twice per shift",
        "Document all falls and near-misses; complete incident report",
      ],
      responsibleStaff: "All Staff",
      reviewDate,
    });
  }

  // ── Health: Medications ─────────────────────────────────────
  if (data.medications) {
    items.push({
      need: "Medication Management",
      goal: `${data.residentName} will receive all prescribed medications accurately and on schedule.`,
      interventions: [
        "Administer medications per physician orders — document in MAR",
        "Monitor for side effects and adverse reactions",
        "Keep medication list updated; review with physician at each appointment",
        data.allergies ? `Known allergies: ${data.allergies} — alert all staff` : "No known allergies — verify at each medication review",
      ].filter(Boolean) as string[],
      responsibleStaff: "Nurse / Medication Aide",
      reviewDate,
    });
  }

  // ── Cognitive Support ───────────────────────────────────────
  if (data.memoryStatus && data.memoryStatus !== "Intact") {
    items.push({
      need: "Cognitive Support / Memory Care",
      goal: `${data.residentName} will be supported in maintaining orientation and maximum cognitive function in a safe, structured environment.`,
      interventions: [
        "Use consistent routines and familiar cues daily",
        "Display calendar, clock, and familiar photos in resident's room",
        `Provide ${data.orientation?.toLowerCase() || "reality"} orientation cues as needed`,
        "Engage in cognitively stimulating activities (puzzles, music, reading)",
        "Reassure and redirect if confused; avoid arguing",
        "Document changes in cognitive status and report to nurse",
      ],
      responsibleStaff: "All Staff",
      reviewDate,
    });
  }

  // ── Behavioral Support ──────────────────────────────────────
  if (data.behavioralConcerns) {
    items.push({
      need: "Behavioral Support",
      goal: `${data.residentName} will experience reduced behavioral episodes through consistent person-centered interventions.`,
      interventions: [
        `Known behavioral concerns: ${data.behavioralConcerns}`,
        "Identify triggers and document patterns — share with all staff",
        "Use redirection, validation, and de-escalation techniques",
        "Ensure needs (hunger, pain, toileting, stimulation) are met proactively",
        "Notify supervisor of new or escalating behaviors",
      ],
      responsibleStaff: "All Staff",
      reviewDate,
    });
  }

  // ── Nutrition ───────────────────────────────────────────────
  if (data.eating && data.eating !== "Independent") {
    items.push({
      need: "Nutrition / Dining Assistance",
      goal: `${data.residentName} will maintain adequate nutrition and hydration with ${data.eating.toLowerCase()} dining assistance.`,
      interventions: [
        `Provide ${data.eating.toLowerCase()} assistance at meals`,
        data.foodPreferences ? `Honor food preferences: ${data.foodPreferences}` : "Document and honor food preferences",
        "Encourage fluid intake throughout the day",
        "Monitor weight monthly — report 5+ lb change to nurse",
        "Document meal intake percentage at each meal",
      ].filter(Boolean) as string[],
      responsibleStaff: "Direct Care Staff",
      reviewDate,
    });
  }

  // ── Social / Emotional ──────────────────────────────────────
  items.push({
    need: "Social / Emotional Wellbeing",
    goal: `${data.residentName} will demonstrate positive social engagement and emotional wellbeing.`,
    interventions: [
      data.activityPreferences
        ? `Engage in preferred activities: ${data.activityPreferences}`
        : "Offer a variety of structured and unstructured activities",
      data.culturalReligious
        ? `Support cultural/religious preferences: ${data.culturalReligious}`
        : "Respect and support individual cultural and religious preferences",
      data.visitorPreferences
        ? `Visitor preferences: ${data.visitorPreferences}`
        : "Encourage family visits and involvement in care",
      `Mood: ${data.mood || "Monitor regularly"} — document changes`,
      "Notify supervisor of signs of depression, anxiety, or withdrawal",
    ].filter(Boolean) as string[],
    responsibleStaff: "All Staff",
    reviewDate,
  });

  // ── Resident / Family Goals ─────────────────────────────────
  if (data.residentGoals || data.familyGoals) {
    items.push({
      need: "Resident & Family Goals",
      goal: "Care will be delivered in alignment with the resident's and family's stated goals and wishes.",
      interventions: [
        data.residentGoals ? `Resident goal: ${data.residentGoals}` : "",
        data.familyGoals ? `Family goal: ${data.familyGoals}` : "",
        "Review goals at each care plan meeting (minimum quarterly)",
        "Document any changes in goals or preferences",
      ].filter(Boolean) as string[],
      responsibleStaff: "Care Coordinator",
      reviewDate,
    });
  }

  return items;
}

export function formatTemplateAsText(
  residentName: string,
  assessmentDate: string,
  items: CarePlanItem[]
): string {
  const lines: string[] = [
    `INDIVIDUAL CARE PLAN`,
    `Resident: ${residentName}`,
    `Assessment Date: ${assessmentDate}`,
    `Plan Created: ${new Date().toLocaleDateString()}`,
    `Review Date: ${items[0]?.reviewDate ?? ""}`,
    "",
    "═".repeat(60),
    "",
  ];

  items.forEach((item, i) => {
    lines.push(`${i + 1}. NEED: ${item.need}`);
    lines.push(`   GOAL: ${item.goal}`);
    lines.push(`   INTERVENTIONS:`);
    item.interventions.forEach((iv) => lines.push(`     • ${iv}`));
    lines.push(`   RESPONSIBLE: ${item.responsibleStaff}`);
    lines.push(`   REVIEW DATE: ${item.reviewDate}`);
    lines.push("");
  });

  return lines.join("\n");
}

function getReviewDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toLocaleDateString();
}
