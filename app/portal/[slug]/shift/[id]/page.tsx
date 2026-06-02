"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const ADL_TASKS = [
  "To/From Chair/Wheelchair","Ambulation / Walking","Bathing / Showering",
  "Grooming / Personal Hygiene","Dressing","Oral Care","Toileting",
  "Eating / Drinking","Meal Preparation (Breakfast)","Meal Preparation (Lunch)",
  "Meal Preparation (Dinner)","Medication Management","Household Organization",
  "Laundry","Bed Mobility / Transfers","Skin Care",
  "Planning Activities for Patient","ADL(s) — General Assistance",
];

type ShiftInfo = {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string | null;
  status: string;
  staff: { first_name: string; last_name: string; id?: string } | null;
  residents: { first_name: string; last_name: string; address: string | null; id?: string } | null;
  organizations: { name: string; primary_color: string | null; logo_url: string | null } | null;
  facility_id: string;
};

type Step = "ready" | "in" | "report" | "done";

function fmt12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export default function ShiftClockInPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const [shift, setShift]         = useState<ShiftInfo | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [step, setStep]               = useState<Step>("ready");
  const [visitId, setVisitId]         = useState<string | null>(null);
  const [clockInTime, setClockInTime] = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [coords, setCoords]           = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus]     = useState<"idle"|"getting"|"got"|"denied">("idle");
  const [geoWarning, setGeoWarning]   = useState<string | null>(null);

  // Report state
  const [adlChecked, setAdlChecked]         = useState<Record<string, boolean>>({});
  const [mood, setMood]                     = useState("");
  const [behaviorChanges, setBehaviorChanges] = useState("");
  const [cooperationLevel, setCooperationLevel] = useState("");
  const [morningRoutine, setMorningRoutine]   = useState("");
  const [mealPrep, setMealPrep]               = useState("");
  const [carePlanChanges, setCarePlanChanges] = useState("");
  const [painLevel, setPainLevel]             = useState("");
  const [fallOccurred, setFallOccurred]       = useState(false);
  const [incidentOccurred, setIncidentOccurred] = useState(false);
  const [incidentDesc, setIncidentDesc]       = useState("");
  const [caregiverNotes, setCaregiverNotes]   = useState("");

  useEffect(() => {
    fetch(`/api/shifts/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setShift(d); else setLoadError(true); })
      .catch(() => setLoadError(true));
  }, [id]);

  function getGPS() {
    setGpsStatus("getting");
    navigator.geolocation.getCurrentPosition(
      p => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setGpsStatus("got"); },
      () => setGpsStatus("denied"), { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function api(body: Record<string, unknown>) {
    const res = await fetch(`/api/portal/${slug}/visit`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    return res.json();
  }

  async function handleClockIn() {
    if (!shift) return;
    setLoading(true); setError(null);

    const caregiverName = shift.staff ? `${shift.staff.first_name} ${shift.staff.last_name}` : "Caregiver";
    const clientName    = shift.residents ? `${shift.residents.first_name} ${shift.residents.last_name}` : "";

    const data = await api({
      action: "clock_in",
      caregiverName,
      clientName,
      staffId:    null,
      residentId: null,
      shiftId:    shift.id,
      lat:  coords?.lat ?? null,
      lng:  coords?.lng ?? null,
    });

    if (data.error) { setError(data.error); setLoading(false); return; }
    if (data.geoWarning) setGeoWarning(data.geoWarning);
    setVisitId(data.visitId);
    setClockInTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    setStep("in"); setLoading(false);
  }

  async function handleClockOut() {
    if (!visitId) return; setLoading(true);
    let lat = null, lng = null;
    try { await new Promise<void>(res => navigator.geolocation.getCurrentPosition(p => { lat = p.coords.latitude; lng = p.coords.longitude; res(); }, () => res(), { timeout: 5000 })); } catch {}
    await api({ action: "clock_out", visitId, lat, lng });
    setStep("report"); setLoading(false);
  }

  async function handleSubmitReport() {
    if (!visitId) return; setLoading(true);
    await api({
      action: "submit_report", visitId, mood, behaviorChanges, cooperationLevel, morningRoutine,
      mealPrep, carePlanChanges, painLevel, fallOccurred, incidentOccurred,
      incidentDesc: incidentDesc||null,
      adlChecklist: ADL_TASKS.map(t => ({ task: t, completed: adlChecked[t]??false })),
      caregiverNotes,
      shiftId: shift?.id ?? null,
    });
    setStep("done"); setLoading(false);
  }

  if (loadError) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl p-10 text-center max-w-sm border border-slate-200">
        <p className="text-4xl mb-3">⚠</p>
        <p className="font-bold text-slate-800">Shift not found</p>
        <p className="text-slate-500 text-sm mt-1">This link may be invalid or expired.</p>
      </div>
    </div>
  );

  if (!shift) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const org         = shift.organizations;
  const color       = org?.primary_color ?? "#1a3a52";
  const caregiverName = shift.staff ? `${shift.staff.first_name} ${shift.staff.last_name}` : "Caregiver";
  const clientName    = shift.residents ? `${shift.residents.first_name} ${shift.residents.last_name}` : "";
  const clientAddress = shift.residents?.address;
  const dateLabel     = new Date(`${shift.shift_date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const timeLabel     = `${fmt12h(shift.start_time)}${shift.end_time ? ` – ${fmt12h(shift.end_time)}` : ""}`;
  const inp = "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2";

  const Hdr = ({ subtitle }: { subtitle: string }) => (
    <div className="text-white px-5 py-4 flex items-center gap-3" style={{ backgroundColor: color }}>
      {org?.logo_url
        ? <img src={org.logo_url} alt="" className="h-9 w-9 rounded-lg object-contain bg-white/10 p-0.5" />
        : <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">{(org?.name??"CA").slice(0,2).toUpperCase()}</div>
      }
      <div><p className="font-bold">{org?.name ?? "Care Agency"}</p><p className="text-xs opacity-70">{subtitle}</p></div>
    </div>
  );

  if (step === "done") return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}><Hdr subtitle="Visit Complete" />
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-sm">
          <p className="text-5xl mb-4">✅</p>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Visit Complete!</h2>
          <p className="text-slate-500">Report submitted{clientName ? ` for ${clientName}` : ""}. Have a great rest of your day!</p>
        </div>
      </div>
    </div>
  );

  if (step === "in") return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}><Hdr subtitle="Shift In Progress" />
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl border-2 border-emerald-200 p-6 text-center shadow-sm" style={{ background: "#ecfdf5" }}>
          <p className="text-4xl mb-2">🟢</p>
          <p className="font-bold text-emerald-900 text-xl">Clocked In at {clockInTime}</p>
          <p className="text-emerald-700 mt-1">{caregiverName}{clientName ? ` → ${clientName}` : ""}</p>
          {geoWarning && <p className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5">⚠ {geoWarning}</p>}
        </div>
        <button onClick={handleClockOut} disabled={loading}
          className="w-full rounded-2xl py-4 text-lg font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-lg"
          style={{ backgroundColor: "#dc2626" }}>
          {loading ? "Processing…" : "🔴 Clock Out & Submit Report"}
        </button>
      </div>
    </div>
  );

  if (step === "report") return (
    <div className="min-h-screen pb-12" style={{ background: "#f0f4f8" }}><Hdr subtitle="Service Report" />
      <div className="max-w-md mx-auto px-4 pt-5 space-y-4">
        <div className="bg-white rounded-2xl border-2 border-amber-200 p-5 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-1">📝 Caregiver Notes</h2>
          <textarea value={caregiverNotes} onChange={e => setCaregiverNotes(e.target.value)} rows={4}
            placeholder="Write your observations about this visit..." className={`${inp} resize-none`} />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-3">✅ ADL Checklist</h2>
          <div className="space-y-2">{ADL_TASKS.map(t => (
            <label key={t} className="flex items-center gap-3 py-1.5 border-b border-slate-50 last:border-0 cursor-pointer">
              <input type="checkbox" checked={adlChecked[t]??false} onChange={e => setAdlChecked(p => ({...p,[t]:e.target.checked}))} className="w-5 h-5 rounded accent-emerald-600" />
              <span className="text-sm text-slate-700">{t}</span>
            </label>
          ))}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h2 className="font-bold text-slate-900">📋 Clinical Notes</h2>
          {([["Client's mood","e.g. Good",mood,setMood],["Behavior / health changes","e.g. None",behaviorChanges,setBehaviorChanges],["Cooperation level","e.g. Great",cooperationLevel,setCooperationLevel],["Morning routine","e.g. Yes",morningRoutine,setMorningRoutine],["Meal preparation","e.g. Ate full breakfast",mealPrep,setMealPrep],["Care plan changes","e.g. No issues",carePlanChanges,setCarePlanChanges],["Pain level (0-10)","e.g. 0 - No Pain",painLevel,setPainLevel]] as [string,string,string,(v:string)=>void][]).map(([label,ph,val,setter]) => (
            <div key={label}><label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
            <input type="text" value={val} onChange={e=>setter(e.target.value)} placeholder={ph} className={inp} /></div>
          ))}
          <div className="pt-2 space-y-2 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={fallOccurred} onChange={e=>setFallOccurred(e.target.checked)} className="w-4 h-4 accent-red-500" /><span className="text-sm font-semibold text-red-700">⚠ Fall occurred</span></label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={incidentOccurred} onChange={e=>setIncidentOccurred(e.target.checked)} className="w-4 h-4 accent-red-500" /><span className="text-sm font-semibold text-red-700">⚠ Incident occurred</span></label>
            {(fallOccurred||incidentOccurred) && <textarea value={incidentDesc} onChange={e=>setIncidentDesc(e.target.value)} rows={2} placeholder="Describe what happened..." className={`${inp} resize-none`} />}
          </div>
        </div>
        <button onClick={handleSubmitReport} disabled={loading}
          className="w-full rounded-2xl py-4 text-lg font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-lg"
          style={{ backgroundColor: color }}>
          {loading ? "Submitting…" : "Submit Service Report"}
        </button>
      </div>
    </div>
  );

  // Step: ready — show shift details + GPS + clock in
  return (
    <div className="min-h-screen pb-12" style={{ background: "#f0f4f8" }}><Hdr subtitle="Assigned Shift" />
      <div className="max-w-md mx-auto px-4 pt-6 space-y-4">
        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}

        {/* Shift summary card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Your Assigned Shift</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">Accepted</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Caregiver</p>
              <p className="font-bold text-slate-900">{caregiverName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Date</p>
              <p className="font-semibold text-slate-800">{dateLabel}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Time</p>
              <p className="font-semibold text-slate-800">{timeLabel}</p>
            </div>
            {clientName && (
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Client</p>
                <p className="font-semibold text-slate-800">{clientName}</p>
              </div>
            )}
          </div>
          {clientAddress && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">📍 Clock In At This Address</p>
              <p className="font-semibold text-blue-900 text-sm">{clientAddress}</p>
            </div>
          )}
        </div>

        {/* GPS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="font-semibold text-slate-800 text-sm mb-3">Capture your location</p>
          {gpsStatus==="idle" && <button type="button" onClick={getGPS} className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 text-sm text-slate-600 hover:border-blue-400 hover:text-blue-700 transition-colors">📍 Tap to capture GPS location</button>}
          {gpsStatus==="getting" && <p className="text-sm text-blue-600 text-center py-2">📍 Getting location…</p>}
          {gpsStatus==="got" && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700 text-center">✓ Location captured</div>}
          {gpsStatus==="denied" && <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">⚠ No GPS — visit will be recorded without location verification</div>}
        </div>

        <button onClick={handleClockIn} disabled={loading}
          className="w-full rounded-2xl py-4 text-lg font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg"
          style={{ backgroundColor: color }}>
          {loading ? "Clocking in…" : "🟢 Clock In"}
        </button>
      </div>
    </div>
  );
}
