"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type OrgBrand = { name: string; primary_color: string | null; logo_url: string | null; tagline: string | null };

export default function BrandedClockInPage() {
  const { slug } = useParams<{ slug: string }>();
  const [org, setOrg] = useState<OrgBrand | null>(null);

  useEffect(() => {
    supabase.from("organizations").select("name, primary_color, logo_url, tagline")
      .eq("slug", slug).maybeSingle()
      .then(({ data }) => setOrg(data ?? { name: "Care Agency", primary_color: "#1a3a52", logo_url: null, tagline: null }));
  }, [slug]);

  if (!org) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const color = org.primary_color ?? "#1a3a52";

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      {/* Branded header */}
      <div className="text-white px-5 py-4 flex items-center gap-3" style={{ backgroundColor: color }}>
        {org.logo_url
          ? <img src={org.logo_url} alt={org.name} className="h-10 w-10 rounded-lg object-contain bg-white/10 p-0.5" />
          : <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center font-bold">{org.name.slice(0,2).toUpperCase()}</div>
        }
        <div>
          <p className="font-bold">{org.name}</p>
          <p className="text-xs opacity-70">{org.tagline ?? "Caregiver Clock In"}</p>
        </div>
      </div>

      {/* Embed the standard clock-in flow */}
      <div className="pt-4">
        <ClockInFlow brandColor={color} orgSlug={slug} />
      </div>
    </div>
  );
}

// ── Inline clock-in flow with brand color ─────────────────────────────────────
const ADL_TASKS = [
  "To/From Chair/Wheelchair","Ambulation / Walking","Bathing / Showering",
  "Grooming / Personal Hygiene","Dressing","Oral Care","Toileting",
  "Eating / Drinking","Meal Preparation (Breakfast)","Meal Preparation (Lunch)",
  "Meal Preparation (Dinner)","Medication Management","Household Organization",
  "Laundry","Bed Mobility / Transfers","Skin Care",
  "Planning Activities for Patient","ADL(s) — General Assistance",
];

function ClockInFlow({ brandColor, orgSlug }: { brandColor: string; orgSlug: string }) {
  const [step, setStep] = useState<"select"|"in"|"report"|"done">("select");
  const [visitId, setVisitId] = useState<string|null>(null);
  const [caregiverName, setCaregiverName] = useState("");
  const [clientName, setClientName] = useState("");
  const [staffId, setStaffId] = useState("");
  const [residentId, setResidentId] = useState("");
  const [staffList, setStaffList] = useState<{id:string;first_name:string;last_name:string}[]>([]);
  const [residents, setResidents] = useState<{id:string;first_name:string;last_name:string}[]>([]);
  const [coords, setCoords] = useState<{lat:number;lng:number}|null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle"|"getting"|"got"|"denied">("idle");
  const [clockInTime, setClockInTime] = useState("");
  const [adlChecked, setAdlChecked] = useState<Record<string,boolean>>({});
  const [mood, setMood] = useState(""); const [behaviorChanges, setBehaviorChanges] = useState(""); const [cooperationLevel, setCooperationLevel] = useState(""); const [morningRoutine, setMorningRoutine] = useState(""); const [mealPrep, setMealPrep] = useState(""); const [carePlanChanges, setCarePlanChanges] = useState(""); const [painLevel, setPainLevel] = useState("");
  const [fallOccurred, setFallOccurred] = useState(false); const [incidentOccurred, setIncidentOccurred] = useState(false); const [incidentDesc, setIncidentDesc] = useState(""); const [caregiverNotes, setCaregiverNotes] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    supabase.from("profiles").select("facility_id").maybeSingle().then(async ({ data }) => {
      if (!data?.facility_id) return;
      const [s, r] = await Promise.all([
        supabase.from("staff").select("id,first_name,last_name").eq("facility_id", data.facility_id),
        supabase.from("residents").select("id,first_name,last_name").eq("facility_id", data.facility_id),
      ]);
      setStaffList(s.data ?? []); setResidents(r.data ?? []);
    });
  }, []);

  function getGPS() {
    setGpsStatus("getting");
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setGpsStatus("got"); },
      () => setGpsStatus("denied"), { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function clockIn() {
    if (!caregiverName || !clientName) { setError("Name and client required"); return; }
    setLoading(true); setError(null);
    const { data: profile } = await supabase.from("profiles").select("facility_id").maybeSingle();
    const now = new Date().toISOString();
    const { data: v, error: e } = await supabase.from("care_visits").insert({
      facility_id: profile?.facility_id, staff_id: staffId||null, resident_id: residentId||null,
      caregiver_name: caregiverName, client_name: clientName, care_setting: "HOME_CARE",
      clock_in_time: now, clock_in_lat: coords?.lat??null, clock_in_lng: coords?.lng??null, status: "active",
    }).select().single();
    if (e || !v) { setError(e?.message ?? "Failed"); setLoading(false); return; }
    setVisitId(v.id); setClockInTime(new Date(now).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));
    setStep("in"); setLoading(false);
  }

  async function clockOut() {
    if (!visitId) return; setLoading(true);
    let lat=null,lng=null;
    try { await new Promise<void>(res => navigator.geolocation.getCurrentPosition(p=>{lat=p.coords.latitude;lng=p.coords.longitude;res();},()=>res(),{timeout:5000})); } catch {}
    const now = new Date().toISOString();
    const {data:v} = await supabase.from("care_visits").select("clock_in_time").eq("id",visitId).single();
    const mins = v?.clock_in_time ? Math.round((new Date(now).getTime()-new Date(v.clock_in_time).getTime())/60000) : null;
    await supabase.from("care_visits").update({clock_out_time:now,clock_out_lat:lat,clock_out_lng:lng,status:"completed",duration_minutes:mins}).eq("id",visitId);
    setStep("report"); setLoading(false);
  }

  async function submitReport() {
    if (!visitId) return; setLoading(true);
    const { data: profile } = await supabase.from("profiles").select("facility_id").maybeSingle();
    await supabase.from("visit_service_reports").insert({
      visit_id: visitId, facility_id: profile?.facility_id,
      mood_demeanor: mood, behavior_changes: behaviorChanges, cooperation_level: cooperationLevel,
      morning_routine: morningRoutine, meal_preparation: mealPrep, care_plan_changes: carePlanChanges,
      pain_level: painLevel, fall_occurred: fallOccurred, incident_occurred: incidentOccurred,
      incident_description: incidentDesc||null,
      adl_checklist: ADL_TASKS.map(t=>({task:t,completed:adlChecked[t]??false})),
      caregiver_notes: caregiverNotes,
    });
    setStep("done"); setLoading(false);
  }

  const inp = "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2";

  if (step === "done") return (
    <div className="max-w-md mx-auto px-4 py-12 text-center">
      <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-sm">
        <p className="text-5xl mb-4">✅</p>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Visit Complete!</h2>
        <p className="text-slate-500 mb-6">Service report submitted for <strong>{clientName}</strong></p>
        <button onClick={() => { setStep("select"); setVisitId(null); setCaregiverName(""); setClientName(""); setCoords(null); setGpsStatus("idle"); setAdlChecked({}); }} className="w-full rounded-xl py-3 font-bold text-white hover:opacity-90" style={{ backgroundColor: brandColor }}>Start New Visit</button>
        <Link href={`/portal/${orgSlug}`} className="block mt-3 text-sm text-slate-400 hover:text-slate-600">Back to portal</Link>
      </div>
    </div>
  );

  if (step === "in") return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      <div className="bg-white rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 shadow-sm text-center">
        <p className="text-4xl mb-2">🟢</p>
        <p className="font-bold text-emerald-900 text-lg">Clocked In at {clockInTime}</p>
        <p className="text-emerald-700 text-sm mt-1">{caregiverName} → {clientName}</p>
      </div>
      <button onClick={clockOut} disabled={loading} className="w-full rounded-2xl py-4 text-lg font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-lg" style={{ backgroundColor: "#dc2626" }}>
        {loading ? "Processing…" : "🔴 Clock Out & Submit Report"}
      </button>
    </div>
  );

  if (step === "report") return (
    <div className="max-w-md mx-auto px-4 pb-12 space-y-4">
      <div className="bg-white rounded-2xl border-2 border-amber-200 p-5 shadow-sm">
        <h2 className="font-bold text-slate-900 mb-1">📝 Caregiver Notes</h2>
        <textarea value={caregiverNotes} onChange={e=>setCaregiverNotes(e.target.value)} rows={4}
          placeholder="Write your observations about this visit..." className={`${inp} resize-none`} />
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="font-bold text-slate-900 mb-3">✅ ADL Checklist</h2>
        <div className="space-y-2">
          {ADL_TASKS.map(t => (
            <label key={t} className="flex items-center gap-3 py-1.5 border-b border-slate-50 last:border-0 cursor-pointer">
              <input type="checkbox" checked={adlChecked[t]??false} onChange={e=>setAdlChecked(p=>({...p,[t]:e.target.checked}))} className="w-5 h-5 rounded accent-emerald-600" />
              <span className="text-sm text-slate-700">{t}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h2 className="font-bold text-slate-900">📋 Clinical Notes</h2>
        {[
          ["mood_demeanor","Client's overall mood and demeanor","e.g. Good 👍",mood,setMood],
          ["behavior_changes","Any changes in behavior / health","e.g. None 😊",behaviorChanges,setBehaviorChanges],
          ["cooperation_level","Level of cooperation","e.g. Great 🤩",cooperationLevel,setCooperationLevel],
          ["morning_routine","Morning routine assistance","e.g. Yes 🤙🏽",morningRoutine,setMorningRoutine],
          ["meal_preparation","Meal preparation","e.g. Ate full breakfast",mealPrep,setMealPrep],
          ["care_plan_changes","Anticipated care plan changes","e.g. No issues",carePlanChanges,setCarePlanChanges],
          ["pain_level","Pain level (0-10)","e.g. 0 - No Pain",painLevel,setPainLevel],
        ].map(([key,label,ph,val,setter]) => (
          <div key={key as string}>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{label as string}</label>
            <input type="text" value={val as string} onChange={e=>(setter as (v:string)=>void)(e.target.value)} placeholder={ph as string} className={inp} />
          </div>
        ))}
        <label className="flex items-center gap-2 pt-2 cursor-pointer"><input type="checkbox" checked={fallOccurred} onChange={e=>setFallOccurred(e.target.checked)} className="w-4 h-4 accent-red-500" /><span className="text-sm font-semibold text-red-700">⚠ Fall occurred</span></label>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={incidentOccurred} onChange={e=>setIncidentOccurred(e.target.checked)} className="w-4 h-4 accent-red-500" /><span className="text-sm font-semibold text-red-700">⚠ Incident occurred</span></label>
        {(fallOccurred||incidentOccurred) && <textarea value={incidentDesc} onChange={e=>setIncidentDesc(e.target.value)} rows={2} placeholder="Describe..." className={`${inp} resize-none`} />}
      </div>
      <button onClick={submitReport} disabled={loading} className="w-full rounded-2xl py-4 text-lg font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-lg" style={{ backgroundColor: brandColor }}>
        {loading ? "Submitting…" : "Submit Service Report"}
      </button>
    </div>
  );

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Name *</label>
          {staffList.length > 0 ? (
            <select value={staffId} onChange={e=>{setStaffId(e.target.value);const s=staffList.find(x=>x.id===e.target.value);if(s)setCaregiverName(`${s.first_name} ${s.last_name}`);}} className={inp}>
              <option value="">— Select your name —</option>
              {staffList.map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          ) : <input type="text" value={caregiverName} onChange={e=>setCaregiverName(e.target.value)} placeholder="Your full name" className={inp} />}
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client Name *</label>
          {residents.length > 0 ? (
            <select value={residentId} onChange={e=>{setResidentId(e.target.value);const r=residents.find(x=>x.id===e.target.value);if(r)setClientName(`${r.first_name} ${r.last_name}`);}} className={inp}>
              <option value="">— Select client —</option>
              {residents.map(r=><option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
            </select>
          ) : <input type="text" value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="Client name" className={inp} />}
        </div>
        <div>
          {gpsStatus==="idle" && <button type="button" onClick={getGPS} className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 text-sm text-slate-600 hover:border-blue-400">📍 Capture GPS Location</button>}
          {gpsStatus==="getting" && <p className="text-sm text-blue-600 py-2">📍 Getting location…</p>}
          {gpsStatus==="got" && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">✓ Location captured</div>}
          {gpsStatus==="denied" && <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">⚠ No GPS — will log without location</div>}
        </div>
      </div>
      <button onClick={clockIn} disabled={loading||!caregiverName||!clientName} className="w-full rounded-2xl py-4 text-lg font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-lg" style={{ backgroundColor: brandColor }}>
        {loading ? "Clocking in…" : "🟢 Clock In"}
      </button>
    </div>
  );
}
