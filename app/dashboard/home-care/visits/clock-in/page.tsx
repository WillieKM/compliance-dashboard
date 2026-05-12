"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ADL_TASKS = [
  "To/From Chair/Wheelchair",
  "Ambulation / Walking",
  "Bathing / Showering",
  "Grooming / Personal Hygiene",
  "Dressing",
  "Oral Care",
  "Toileting",
  "Eating / Drinking",
  "Meal Preparation (Breakfast)",
  "Meal Preparation (Lunch)",
  "Meal Preparation (Dinner)",
  "Medication Management",
  "Household Organization",
  "Laundry",
  "Bed Mobility / Transfers",
  "Skin Care",
  "Planning Activities for Patient",
  "ADL(s) — General Assistance",
];

const navy = "#1a3a52";
const gold = "#d4a574";

type Step = "select" | "clocked_in" | "report" | "done";

export default function ClockInPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("select");
  const [visitId, setVisitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state — step 1
  const [caregiverName, setCaregiverName] = useState("");
  const [clientName, setClientName] = useState("");
  const [residents, setResidents] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [residentId, setResidentId] = useState("");
  const [staffList, setStaffList] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [staffId, setStaffId] = useState("");
  const [gpsStatus, setGpsStatus] = useState<"idle" | "getting" | "got" | "denied">("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [clockInTime, setClockInTime] = useState<string | null>(null);

  // Form state — service report
  const [adlChecked, setAdlChecked] = useState<Record<string, boolean>>({});
  const [mood, setMood] = useState("");
  const [behaviorChanges, setBehaviorChanges] = useState("");
  const [cooperationLevel, setCooperationLevel] = useState("");
  const [morningRoutine, setMorningRoutine] = useState("");
  const [mealPrep, setMealPrep] = useState("");
  const [carePlanChanges, setCarePlanChanges] = useState("");
  const [painLevel, setPainLevel] = useState("");
  const [fallOccurred, setFallOccurred] = useState(false);
  const [incidentOccurred, setIncidentOccurred] = useState(false);
  const [incidentDesc, setIncidentDesc] = useState("");
  const [caregiverNotes, setCaregiverNotes] = useState("");

  // Load residents and staff
  useEffect(() => {
    async function load() {
      const { data: profile } = await supabase.from("profiles").select("facility_id").maybeSingle();
      if (!profile?.facility_id) return;
      const [resRes, staffRes] = await Promise.all([
        supabase.from("residents").select("id, first_name, last_name").eq("facility_id", profile.facility_id),
        supabase.from("staff").select("id, first_name, last_name").eq("facility_id", profile.facility_id),
      ]);
      setResidents(resRes.data ?? []);
      setStaffList(staffRes.data ?? []);
    }
    load();
  }, []);

  function getGPS() {
    setGpsStatus("getting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus("got");
      },
      () => setGpsStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleClockIn() {
    if (!caregiverName) {
      setError("Caregiver name is required.");
      return;
    }
    setLoading(true);
    setError(null);

    const { data: profile } = await supabase.from("profiles").select("facility_id").maybeSingle();
    if (!profile?.facility_id) { setError("Not logged in."); setLoading(false); return; }

    const now = new Date().toISOString();
    const { data: visit, error: err } = await supabase.from("care_visits").insert({
      facility_id: profile.facility_id,
      staff_id: staffId || null,
      resident_id: residentId || null,
      caregiver_name: caregiverName,
      client_name: clientName,
      care_setting: "HOME_CARE",
      clock_in_time: now,
      clock_in_lat: coords?.lat ?? null,
      clock_in_lng: coords?.lng ?? null,
      status: "active",
    }).select().single();

    if (err || !visit) { setError(err?.message ?? "Failed to clock in"); setLoading(false); return; }

    setVisitId(visit.id);
    setClockInTime(new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    setStep("clocked_in");
    setLoading(false);
  }

  async function handleClockOut() {
    if (!visitId) return;
    setLoading(true);

    let clockOutLat = null, clockOutLng = null;
    try {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => { clockOutLat = pos.coords.latitude; clockOutLng = pos.coords.longitude; resolve(); },
          () => resolve(),
          { timeout: 5000 }
        );
      });
    } catch { /**/ }

    const now = new Date().toISOString();
    const { data: visit } = await supabase.from("care_visits").select("clock_in_time").eq("id", visitId).single();
    const mins = visit?.clock_in_time
      ? Math.round((new Date(now).getTime() - new Date(visit.clock_in_time).getTime()) / 60000)
      : null;

    await supabase.from("care_visits").update({
      clock_out_time: now,
      clock_out_lat: clockOutLat,
      clock_out_lng: clockOutLng,
      status: "completed",
      duration_minutes: mins,
    }).eq("id", visitId);

    setStep("report");
    setLoading(false);
  }

  async function handleSubmitReport() {
    if (!visitId) return;
    setLoading(true);

    const { data: profile } = await supabase.from("profiles").select("facility_id").maybeSingle();

    const adlChecklist = ADL_TASKS.map((task) => ({
      task,
      completed: adlChecked[task] ?? false,
    }));

    await supabase.from("visit_service_reports").insert({
      visit_id: visitId,
      facility_id: profile?.facility_id,
      mood_demeanor: mood,
      behavior_changes: behaviorChanges,
      cooperation_level: cooperationLevel,
      morning_routine: morningRoutine,
      meal_preparation: mealPrep,
      care_plan_changes: carePlanChanges,
      pain_level: painLevel,
      fall_occurred: fallOccurred,
      incident_occurred: incidentOccurred,
      incident_description: incidentDesc || null,
      adl_checklist: adlChecklist,
      caregiver_notes: caregiverNotes,
    });

    setStep("done");
    setLoading(false);
  }

  // ── STEP: Select client / clock in ──────────────────────────────
  if (step === "select") return (
    <div className="min-h-screen pb-12" style={{ background: "#f0f4f8" }}>
      <div className="text-white px-5 py-5 text-center" style={{ background: `linear-gradient(135deg, ${navy}, #274f6e)` }}>
        <h1 className="text-2xl font-bold">Clock In</h1>
        <p className="text-white/70 text-sm mt-0.5">Home Care Visit</p>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-4">
        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Name (Caregiver) *</label>
            {staffList.length > 0 ? (
              <select value={staffId} onChange={(e) => {
                setStaffId(e.target.value);
                const s = staffList.find((s) => s.id === e.target.value);
                if (s) setCaregiverName(`${s.first_name} ${s.last_name}`);
              }} className={inp}>
                <option value="">— Select your name —</option>
                {staffList.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
              </select>
            ) : (
              <input type="text" value={caregiverName} onChange={(e) => setCaregiverName(e.target.value)}
                placeholder="Enter your full name" className={inp} />
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client Name (optional)</label>
            {residents.length > 0 ? (
              <select value={residentId} onChange={(e) => {
                setResidentId(e.target.value);
                const r = residents.find((r) => r.id === e.target.value);
                if (r) setClientName(`${r.first_name} ${r.last_name}`);
              }} className={inp}>
                <option value="">— Select client —</option>
                {residents.map((r) => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
              </select>
            ) : (
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                placeholder="Client's full name" className={inp} />
            )}
          </div>

          {/* GPS */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Location Verification</label>
            {gpsStatus === "idle" && (
              <button onClick={getGPS} className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 text-sm text-slate-600 hover:border-blue-400 hover:text-blue-700 transition-colors">
                📍 Tap to capture GPS location
              </button>
            )}
            {gpsStatus === "getting" && <p className="text-sm text-blue-600 py-2">📍 Getting location…</p>}
            {gpsStatus === "got" && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
                ✓ Location captured ({coords?.lat.toFixed(4)}, {coords?.lng.toFixed(4)})
              </div>
            )}
            {gpsStatus === "denied" && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
                ⚠ Location access denied — visit will be recorded without GPS
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleClockIn}
          disabled={loading || !caregiverName}
          className="w-full rounded-2xl py-4 text-lg font-bold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg"
          style={{ backgroundColor: navy, color: "white" }}
        >
          {loading ? "Clocking in…" : "🟢 Clock In"}
        </button>
      </div>
    </div>
  );

  // ── STEP: Clocked in — during visit ─────────────────────────────
  if (step === "clocked_in") return (
    <div className="min-h-screen pb-12" style={{ background: "#f0f4f8" }}>
      <div className="text-white px-5 py-5 text-center" style={{ background: `linear-gradient(135deg, #166534, #15803d)` }}>
        <p className="text-4xl mb-2">🟢</p>
        <h1 className="text-xl font-bold">You are Clocked In</h1>
        <p className="text-white/80 text-sm mt-1">Visit started at {clockInTime}</p>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold text-slate-900">{caregiverName}</p>
              <p className="text-sm text-slate-500">Caregiver → {clientName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Clocked in</p>
              <p className="font-semibold text-emerald-600">{clockInTime}</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">
            Complete the visit with your client. When finished, tap <strong>Clock Out & Submit Report</strong> below.
          </p>
        </div>

        <button
          onClick={handleClockOut}
          disabled={loading}
          className="w-full rounded-2xl py-4 text-lg font-bold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg"
          style={{ backgroundColor: "#dc2626", color: "white" }}
        >
          {loading ? "Processing…" : "🔴 Clock Out & Submit Report"}
        </button>
      </div>
    </div>
  );

  // ── STEP: Service report ─────────────────────────────────────────
  if (step === "report") return (
    <div className="min-h-screen pb-12" style={{ background: "#f0f4f8" }}>
      <div className="text-white px-5 py-4" style={{ background: `linear-gradient(135deg, ${navy}, #274f6e)` }}>
        <h1 className="text-xl font-bold">Service Report</h1>
        <p className="text-white/70 text-sm">{caregiverName} — {clientName}</p>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-5">

        {/* Caregiver Notes — first so it's never missed */}
        <div className="bg-white rounded-2xl border-2 border-amber-200 p-5 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-1">📝 Caregiver Notes</h2>
          <p className="text-xs text-slate-500 mb-3">Write any observations about this visit before completing the checklist below</p>
          <textarea
            value={caregiverNotes} onChange={(e) => setCaregiverNotes(e.target.value)}
            rows={4} placeholder="e.g. Client was in good spirits. Reminded family about medication refill needed by Friday..."
            className={`${inp} resize-none`}
          />
        </div>

        {/* ADL Checklist */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-3">✅ ADL Checklist</h2>
          <p className="text-xs text-slate-500 mb-3">Check all tasks completed during this visit</p>
          <div className="space-y-2">
            {ADL_TASKS.map((task) => (
              <label key={task} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adlChecked[task] ?? false}
                  onChange={(e) => setAdlChecked((prev) => ({ ...prev, [task]: e.target.checked }))}
                  className="w-5 h-5 rounded accent-emerald-600"
                />
                <span className="text-sm text-slate-700">{task}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Clinical Q&A */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900">📋 Clinical Q&A</h2>

          {[
            { label: "Client's overall mood and demeanor", value: mood, set: setMood, placeholder: "e.g. Good 👍, Anxious 😟, Happy 😊" },
            { label: "Any noticeable changes in behavior or health status", value: behaviorChanges, set: setBehaviorChanges, placeholder: "e.g. None 😊, Seemed more confused today" },
            { label: "Level of cooperation and engagement", value: cooperationLevel, set: setCooperationLevel, placeholder: "e.g. Great 🤩, Cooperative, Resistant" },
            { label: "Morning routine assistance (dressing, grooming, toileting)", value: morningRoutine, set: setMorningRoutine, placeholder: "e.g. Yes 🤙🏽, Refused bathing" },
            { label: "Meal preparation and feeding (Breakfast, Lunch, Dinner)", value: mealPrep, set: setMealPrep, placeholder: "e.g. Ate full breakfast, Refused lunch" },
            { label: "Any anticipated changes in the care plan", value: carePlanChanges, set: setCarePlanChanges, placeholder: "e.g. No issues / None, May need more assistance with walking" },
            { label: "Pain level (0=No Pain, 10=Severe)", value: painLevel, set: setPainLevel, placeholder: "e.g. 0 - No Pain, 3 - Mild" },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
              <input type="text" value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} className={inp} />
            </div>
          ))}

          {/* Incident flags */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={fallOccurred} onChange={(e) => setFallOccurred(e.target.checked)} className="w-5 h-5 accent-red-500" />
              <span className="text-sm font-semibold text-red-700">⚠ Fall occurred during this visit</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={incidentOccurred} onChange={(e) => setIncidentOccurred(e.target.checked)} className="w-5 h-5 accent-red-500" />
              <span className="text-sm font-semibold text-red-700">⚠ Incident / safety concern occurred</span>
            </label>
            {(fallOccurred || incidentOccurred) && (
              <textarea
                value={incidentDesc} onChange={(e) => setIncidentDesc(e.target.value)}
                rows={3} placeholder="Describe what happened..."
                className={`${inp} resize-none`}
              />
            )}
          </div>
        </div>

        <button
          onClick={handleSubmitReport}
          disabled={loading}
          className="w-full rounded-2xl py-4 text-lg font-bold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg"
          style={{ backgroundColor: navy, color: "white" }}
        >
          {loading ? "Submitting…" : "Submit Service Report"}
        </button>
      </div>
    </div>
  );

  // ── STEP: Done ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f0f4f8" }}>
      <div className="max-w-sm w-full text-center bg-white rounded-2xl shadow-lg border border-slate-200 p-10">
        <p className="text-5xl mb-4">✅</p>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Visit Complete!</h2>
        <p className="text-slate-500 mb-2">Service report submitted for <strong>{clientName}</strong></p>
        <p className="text-sm text-slate-400 mb-6">Report ID: SR-{visitId?.slice(0, 8).toUpperCase()}</p>
        <button
          onClick={() => { setStep("select"); setVisitId(null); setCaregiverName(""); setClientName(""); setCoords(null); setGpsStatus("idle"); setAdlChecked({}); }}
          className="w-full rounded-xl py-3 font-bold text-white hover:opacity-90"
          style={{ backgroundColor: navy }}
        >
          Start New Visit
        </button>
      </div>
    </div>
  );
}

const inp = "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";
