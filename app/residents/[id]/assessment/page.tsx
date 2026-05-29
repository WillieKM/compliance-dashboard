"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { AssessmentData } from "@/lib/careplan/assessmentTemplate";

const ADL_OPTIONS = ["Independent", "Minimal Assist", "Moderate Assist", "Maximum Assist", "Total Assist"];
const RISK_OPTIONS = ["Low", "Moderate", "High"];
const MEMORY_OPTIONS = ["Intact", "Mild Impairment", "Moderate Impairment", "Severe Impairment"];
const ORIENTATION_OPTIONS = ["Fully Oriented", "Oriented to Person Only", "Confused", "Disoriented"];
const PAIN_OPTIONS = ["0 - No Pain", "1-3 Mild", "4-6 Moderate", "7-10 Severe"];

const SECTIONS = [
  "Basic Info",
  "Health Status",
  "Daily Living (ADLs)",
  "Cognitive Status",
  "Behavioral",
  "Safety",
  "Preferences & Goals",
  "Review & Generate",
];

const empty: AssessmentData = {
  residentName: "", assessmentDate: new Date().toISOString().split("T")[0], completedBy: "",
  diagnoses: "", medications: "", allergies: "", painLevel: "",
  bathing: "", dressing: "", toileting: "", mobility: "", eating: "", communication: "",
  memoryStatus: "", orientation: "", decisionMaking: "",
  sleepPatterns: "", mood: "", socialInteraction: "", behavioralConcerns: "",
  fallRisk: "", wanderingRisk: "", otherSafetyNeeds: "",
  foodPreferences: "", activityPreferences: "", culturalReligious: "", visitorPreferences: "",
  residentGoals: "", familyGoals: "",
};

export default function AssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const residentId = params.id as string;

  const [step, setStep] = useState(0);
  const [data, setData] = useState<AssessmentData>(empty);
  const [residentName, setResidentName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [carePlan, setCarePlan] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingLabel, setSettingLabel] = useState("Resident");

  const SETTING_LABELS: Record<string, string> = {
    HOME_CARE: "Home Care", AFH: "AFH",
    ASSISTED_LIVING: "Assisted Living", MULTI_SERVICE: "Multi-Service",
  };

  useEffect(() => {
    supabase
      .from("residents")
      .select("first_name, last_name")
      .eq("id", residentId)
      .maybeSingle()
      .then(({ data: r }) => {
        if (r) {
          const name = `${r.first_name} ${r.last_name}`;
          setResidentName(name);
          setData((d) => ({ ...d, residentName: name }));
        }
      });

    fetch("/api/org/me")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const setting = d?.org?.care_settings?.[0];
        if (setting && SETTING_LABELS[setting]) setSettingLabel(SETTING_LABELS[setting]);
      })
      .catch(() => {});
  }, [residentId]);

  function set(field: keyof AssessmentData, value: string) {
    setData((d) => ({ ...d, [field]: value }));
  }

  async function generateCarePlan() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/care-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentData: data }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setCarePlan(json.carePlanText);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function saveCarePlan() {
    if (!carePlan) return;
    setSaving(true);
    const { data: profile } = await supabase.from("profiles").select("facility_id").limit(1).maybeSingle();
    const facilityId = profile?.facility_id;

    await supabase.from("assessments").insert({
      facility_id: facilityId,
      resident_id: residentId,
      assessment_date: data.assessmentDate,
      completed_by: data.completedBy,
      assessment_data: data,
      care_plan_text: carePlan,
      care_plan_generated: true,
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => router.push(`/residents/${residentId}`), 1500);
  }

  const progress = Math.round((step / (SECTIONS.length - 1)) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href={`/residents/${residentId}`} className="text-blue-600 hover:underline text-sm">
          ← Back to {residentName || "Resident"}
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mt-2">{settingLabel} Resident Assessment</h1>
        <p className="text-slate-500 mt-1">Complete all sections to generate a care plan</p>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>{SECTIONS[step]}</span>
          <span>{step + 1} of {SECTIONS.length}</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex gap-1 mt-2 flex-wrap">
          {SECTIONS.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                i === step ? "bg-blue-600 text-white border-blue-600" :
                i < step ? "bg-green-100 text-green-700 border-green-200" :
                "bg-white text-slate-500 border-slate-200"
              }`}
            >
              {i < step ? "✓ " : ""}{s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        {/* ── SECTION 0: Basic Info ── */}
        {step === 0 && (
          <Section title="Basic Information">
            <Field label="Resident Name" required>
              <input type="text" value={data.residentName} onChange={(e) => set("residentName", e.target.value)} className={input} />
            </Field>
            <Field label="Assessment Date" required>
              <input type="date" value={data.assessmentDate} onChange={(e) => set("assessmentDate", e.target.value)} className={input} />
            </Field>
            <Field label="Completed By">
              <input type="text" value={data.completedBy} onChange={(e) => set("completedBy", e.target.value)} placeholder="Staff name / title" className={input} />
            </Field>
          </Section>
        )}

        {/* ── SECTION 1: Health ── */}
        {step === 1 && (
          <Section title="Health Status">
            <Field label="Primary Diagnoses / Medical Conditions">
              <textarea value={data.diagnoses} onChange={(e) => set("diagnoses", e.target.value)} rows={3} placeholder="e.g. Diabetes Type 2, Hypertension, Dementia (mild)" className={textarea} />
            </Field>
            <Field label="Current Medications">
              <textarea value={data.medications} onChange={(e) => set("medications", e.target.value)} rows={3} placeholder="List medications or write 'See MAR'" className={textarea} />
            </Field>
            <Field label="Known Allergies">
              <input type="text" value={data.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder="e.g. Penicillin, shellfish — or 'NKDA'" className={input} />
            </Field>
            <Field label="Pain Level (0-10)">
              <Select value={data.painLevel} onChange={(v) => set("painLevel", v)} options={PAIN_OPTIONS} />
            </Field>
          </Section>
        )}

        {/* ── SECTION 2: ADLs ── */}
        {step === 2 && (
          <Section title="Activities of Daily Living (ADLs)">
            <p className="text-sm text-slate-500 mb-4">Select the level of assistance required for each activity.</p>
            {[
              { key: "bathing", label: "Bathing / Showering" },
              { key: "dressing", label: "Dressing / Grooming" },
              { key: "toileting", label: "Toileting / Continence" },
              { key: "mobility", label: "Mobility / Transfers / Walking" },
              { key: "eating", label: "Eating / Feeding" },
              { key: "communication", label: "Communication" },
            ].map(({ key, label }) => (
              <Field key={key} label={label}>
                <Select value={data[key as keyof AssessmentData]} onChange={(v) => set(key as keyof AssessmentData, v)} options={ADL_OPTIONS} />
              </Field>
            ))}
          </Section>
        )}

        {/* ── SECTION 3: Cognitive ── */}
        {step === 3 && (
          <Section title="Cognitive Status">
            <Field label="Memory Status">
              <Select value={data.memoryStatus} onChange={(v) => set("memoryStatus", v)} options={MEMORY_OPTIONS} />
            </Field>
            <Field label="Orientation">
              <Select value={data.orientation} onChange={(v) => set("orientation", v)} options={ORIENTATION_OPTIONS} />
            </Field>
            <Field label="Decision-Making Ability">
              <Select value={data.decisionMaking} onChange={(v) => set("decisionMaking", v)} options={["Independent", "Needs Reminders", "Needs Assistance", "Incapacitated"]} />
            </Field>
          </Section>
        )}

        {/* ── SECTION 4: Behavioral ── */}
        {step === 4 && (
          <Section title="Behavioral Patterns">
            <Field label="Sleep Patterns">
              <input type="text" value={data.sleepPatterns} onChange={(e) => set("sleepPatterns", e.target.value)} placeholder="e.g. Sleeps 7-8 hrs, occasional nighttime waking" className={input} />
            </Field>
            <Field label="Current Mood / Emotional Status">
              <input type="text" value={data.mood} onChange={(e) => set("mood", e.target.value)} placeholder="e.g. Generally pleasant, occasional anxious episodes" className={input} />
            </Field>
            <Field label="Social Interaction">
              <Select value={data.socialInteraction} onChange={(v) => set("socialInteraction", v)} options={["Very Social", "Selectively Social", "Withdrawn", "Isolated"]} />
            </Field>
            <Field label="Behavioral Concerns">
              <textarea value={data.behavioralConcerns} onChange={(e) => set("behavioralConcerns", e.target.value)} rows={3} placeholder="e.g. Occasional verbal agitation in evenings, sundowning behaviors" className={textarea} />
            </Field>
          </Section>
        )}

        {/* ── SECTION 5: Safety ── */}
        {step === 5 && (
          <Section title="Safety Needs">
            <Field label="Fall Risk Level">
              <Select value={data.fallRisk} onChange={(v) => set("fallRisk", v)} options={RISK_OPTIONS} />
            </Field>
            <Field label="Wandering / Elopement Risk">
              <Select value={data.wanderingRisk} onChange={(v) => set("wanderingRisk", v)} options={RISK_OPTIONS} />
            </Field>
            <Field label="Other Safety Needs / Concerns">
              <textarea value={data.otherSafetyNeeds} onChange={(e) => set("otherSafetyNeeds", e.target.value)} rows={2} placeholder="e.g. Vision impairment, seizure history, CPAP use at night" className={textarea} />
            </Field>
          </Section>
        )}

        {/* ── SECTION 6: Preferences & Goals ── */}
        {step === 6 && (
          <Section title="Preferences & Goals">
            <Field label="Food Preferences / Dietary Needs">
              <input type="text" value={data.foodPreferences} onChange={(e) => set("foodPreferences", e.target.value)} placeholder="e.g. Soft foods, no pork, diabetic diet" className={input} />
            </Field>
            <Field label="Activity Preferences">
              <input type="text" value={data.activityPreferences} onChange={(e) => set("activityPreferences", e.target.value)} placeholder="e.g. Watching TV, gardening, music, reading" className={input} />
            </Field>
            <Field label="Cultural / Religious Preferences">
              <input type="text" value={data.culturalReligious} onChange={(e) => set("culturalReligious", e.target.value)} placeholder="e.g. Catholic, attends Sunday mass, halal food" className={input} />
            </Field>
            <Field label="Visitor Preferences">
              <input type="text" value={data.visitorPreferences} onChange={(e) => set("visitorPreferences", e.target.value)} placeholder="e.g. Daughter visits weekly, no unannounced visits" className={input} />
            </Field>
            <Field label="Resident's Own Goals">
              <textarea value={data.residentGoals} onChange={(e) => set("residentGoals", e.target.value)} rows={2} placeholder="What does the resident want to accomplish or maintain?" className={textarea} />
            </Field>
            <Field label="Family / Legal Representative Goals">
              <textarea value={data.familyGoals} onChange={(e) => set("familyGoals", e.target.value)} rows={2} placeholder="What does the family want for their loved one?" className={textarea} />
            </Field>
          </Section>
        )}

        {/* ── SECTION 7: Review & Generate ── */}
        {step === 7 && (
          <Section title="Review & Generate Care Plan">
            {!carePlan ? (
              <div className="space-y-6">
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                  <p className="font-semibold mb-1">Ready to generate</p>
                  <p>Claude AI will use this assessment to write a complete, professional AFH care plan. Review all sections before generating.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Resident", data.residentName],
                    ["Date", data.assessmentDate],
                    ["Diagnoses", data.diagnoses || "—"],
                    ["Fall Risk", data.fallRisk || "—"],
                    ["Memory", data.memoryStatus || "—"],
                    ["Mobility", data.mobility || "—"],
                  ].map(([label, val]) => (
                    <div key={label} className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{label}</p>
                      <p className="text-slate-900 font-medium mt-0.5 truncate">{val}</p>
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
                )}

                <button
                  onClick={generateCarePlan}
                  disabled={generating || !data.residentName}
                  className="w-full rounded-xl bg-blue-600 py-4 text-white font-bold text-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {generating ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                      Generating care plan…
                    </span>
                  ) : "Generate Care Plan with AI"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 text-xl">✅</span>
                    <p className="font-semibold text-slate-900">Care plan generated</p>
                  </div>
                  <button onClick={() => setCarePlan(null)} className="text-sm text-slate-500 hover:text-slate-700 underline">
                    Regenerate
                  </button>
                </div>

                <textarea
                  value={carePlan}
                  onChange={(e) => setCarePlan(e.target.value)}
                  rows={24}
                  className="w-full rounded-lg border border-slate-300 p-4 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex gap-3">
                  <button
                    onClick={saveCarePlan}
                    disabled={saving || saved}
                    className="flex-1 rounded-xl bg-green-600 py-3 text-white font-bold hover:bg-green-700 disabled:opacity-60"
                  >
                    {saved ? "✓ Saved!" : saving ? "Saving…" : "Save Care Plan"}
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([carePlan], { type: "text/plain" });
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `care-plan-${data.residentName.replace(/\s+/g, "-")}-${data.assessmentDate}.txt`;
                      a.click();
                    }}
                    className="px-6 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                  >
                    Download
                  </button>
                </div>
              </div>
            )}
          </Section>
        )}
      </div>

      {/* Navigation */}
      {step < 7 && (
        <div className="flex justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-6 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            ← Back
          </button>
          <button
            onClick={() => setStep((s) => Math.min(7, s + 1))}
            className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700"
          >
            {step === 6 ? "Review & Generate →" : "Next →"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-slate-900 pb-3 border-b border-slate-100">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={input}>
      <option value="">Select…</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

const input = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";
const textarea = `${input} resize-none`;
