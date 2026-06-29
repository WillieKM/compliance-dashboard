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

const NOTE_TYPES = ["Daily Note", "Medication Note", "Incident Report", "Care Plan Update", "Other"];

type OrgBrand = { name: string; primary_color: string | null; logo_url: string | null; tagline: string | null };
type Person   = { id: string; first_name: string; last_name: string; address?: string | null };
type Step     = "select" | "in" | "report" | "notes_only" | "messages" | "done";
type ThreadMessage = { id: string; sender_role: string; sender_name: string; body: string; created_at: string };

export default function CaregiverPortalPage() {
  const { slug } = useParams<{ slug: string }>();
  const [org, setOrg]             = useState<OrgBrand | null>(null);
  const [staffList, setStaffList] = useState<Person[]>([]);
  const [residents, setResidents] = useState<Person[]>([]);

  const [step, setStep]               = useState<Step>("select");
  const [visitId, setVisitId]         = useState<string | null>(null);
  const [clockInTime, setClockInTime] = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const [caregiverName, setCaregiverName] = useState("");
  const [staffId, setStaffId]             = useState("");
  const [clientName, setClientName]       = useState("");
  const [residentId, setResidentId]       = useState("");
  const [coords, setCoords]               = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus]         = useState<"idle"|"getting"|"got"|"denied">("idle");

  // Service report state
  const [adlChecked, setAdlChecked]   = useState<Record<string, boolean>>({});
  const [mood, setMood]               = useState("");
  const [behaviorChanges, setBehaviorChanges] = useState("");
  const [cooperationLevel, setCooperationLevel] = useState("");
  const [morningRoutine, setMorningRoutine]     = useState("");
  const [mealPrep, setMealPrep]                 = useState("");
  const [carePlanChanges, setCarePlanChanges]   = useState("");
  const [painLevel, setPainLevel]               = useState("");
  const [fallOccurred, setFallOccurred]         = useState(false);
  const [incidentOccurred, setIncidentOccurred] = useState(false);
  const [incidentDesc, setIncidentDesc]         = useState("");
  const [caregiverNotes, setCaregiverNotes]     = useState("");

  // Notes-only state
  const [noteDate, setNoteDate]   = useState(new Date().toISOString().slice(0, 10));
  const [noteType, setNoteType]   = useState("Daily Note");
  const [standaloneNote, setStandaloneNote] = useState("");

  // Messages state
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [newMessageBody, setNewMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    async function load() {
      const [orgRes, staffRes, resRes] = await Promise.all([
        fetch(`/api/portal/${slug}/org`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/portal/${slug}/staff`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`/api/portal/${slug}/residents`).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      setOrg(orgRes ?? { name: "Care Agency", primary_color: "#1a3a52", logo_url: null, tagline: null });
      setStaffList(staffRes ?? []);
      setResidents(resRes ?? []);
    }
    load();
  }, [slug]);

  // Poll the office thread every 20s while the Messages screen is open
  useEffect(() => {
    if (step !== "messages" || !staffId) return;
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/portal/${slug}/messages?staffId=${staffId}`);
      const data = await res.json();
      if (!cancelled && data.messages) setThreadMessages(data.messages);
    }
    load();
    const interval = setInterval(load, 7000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [step, staffId, slug]);

  async function sendMessage() {
    if (!newMessageBody.trim() || !staffId) return;
    setSendingMessage(true);
    const res = await fetch(`/api/portal/${slug}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId, senderName: caregiverName, body: newMessageBody }),
    });
    if (res.ok) {
      setNewMessageBody("");
      const updated = await fetch(`/api/portal/${slug}/messages?staffId=${staffId}`).then(r => r.json());
      if (updated.messages) setThreadMessages(updated.messages);
    }
    setSendingMessage(false);
  }

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
    if (!caregiverName) { setError("Your name is required."); return; }
    setLoading(true); setError(null);
    const data = await api({ action: "clock_in", caregiverName, clientName, staffId: staffId||null, residentId: residentId||null, lat: coords?.lat??null, lng: coords?.lng??null });
    if (data.error) { setError(data.error); setLoading(false); return; }
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
    await api({ action: "submit_report", visitId, mood, behaviorChanges, cooperationLevel, morningRoutine, mealPrep, carePlanChanges, painLevel, fallOccurred, incidentOccurred, incidentDesc: incidentDesc||null, adlChecklist: ADL_TASKS.map(t => ({ task: t, completed: adlChecked[t]??false })), caregiverNotes });
    setStep("done"); setLoading(false);
  }

  async function handleSubmitNotesOnly() {
    if (!caregiverName) { setError("Your name is required."); return; }
    if (!standaloneNote.trim()) { setError("Please enter a note."); return; }
    setLoading(true); setError(null);
    const data = await api({ action: "submit_notes", caregiverName, clientName, staffId: staffId||null, residentId: residentId||null, noteDate, noteType, notes: standaloneNote });
    if (data.error) { setError(data.error); }
    setStep("done"); setLoading(false);
  }

  function resetForm() {
    setStep("select"); setVisitId(null); setCaregiverName(""); setClientName(""); setStaffId(""); setResidentId("");
    setCoords(null); setGpsStatus("idle"); setAdlChecked({}); setMood(""); setBehaviorChanges(""); setCooperationLevel("");
    setMorningRoutine(""); setMealPrep(""); setCarePlanChanges(""); setPainLevel(""); setFallOccurred(false);
    setIncidentOccurred(false); setIncidentDesc(""); setCaregiverNotes(""); setStandaloneNote("");
    setNoteDate(new Date().toISOString().slice(0, 10)); setNoteType("Daily Note"); setError(null);
  }

  const selectedResident = residents.find(r => r.id === residentId);
  const color = org?.primary_color ?? "#1a3a52";
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

  if (!org) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f0f4f8" }}>
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (step === "done") return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}><Hdr subtitle="Submitted" />
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-sm">
          <p className="text-5xl mb-4">✅</p>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Submitted!</h2>
          <p className="text-slate-500 mb-6">{clientName ? `Report submitted for ${clientName}` : "Your report has been submitted"}</p>
          <button onClick={resetForm} className="w-full rounded-xl py-3 font-bold text-white hover:opacity-90" style={{ backgroundColor: color }}>
            Start New Visit
          </button>
        </div>
      </div>
    </div>
  );

  if (step === "in") return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}><Hdr subtitle="Currently Clocked In" />
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl border-2 border-emerald-200 p-6 text-center shadow-sm" style={{ background: "#ecfdf5" }}>
          <p className="text-4xl mb-2">🟢</p>
          <p className="font-bold text-emerald-900 text-xl">Clocked In at {clockInTime}</p>
          <p className="text-emerald-700 mt-1">{caregiverName}{clientName ? ` → ${clientName}` : ""}</p>
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
          {([["Client's mood","e.g. Good 👍",mood,setMood],["Behavior / health changes","e.g. None 😊",behaviorChanges,setBehaviorChanges],["Cooperation level","e.g. Great 🤩",cooperationLevel,setCooperationLevel],["Morning routine","e.g. Yes 🤙🏽",morningRoutine,setMorningRoutine],["Meal preparation","e.g. Ate full breakfast",mealPrep,setMealPrep],["Care plan changes","e.g. No issues",carePlanChanges,setCarePlanChanges],["Pain level (0-10)","e.g. 0 - No Pain",painLevel,setPainLevel]] as [string,string,string,(v:string)=>void][]).map(([label,ph,val,setter]) => (
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

  // Notes-only mode
  if (step === "notes_only") return (
    <div className="min-h-screen pb-12" style={{ background: "#f0f4f8" }}><Hdr subtitle="Submit Notes" />
      <div className="max-w-md mx-auto px-4 pt-5 space-y-4">
        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Name *</label>
            {staffList.length > 0
              ? <select value={staffId} onChange={e=>{setStaffId(e.target.value);const s=staffList.find(x=>x.id===e.target.value);if(s)setCaregiverName(`${s.first_name} ${s.last_name}`);}} className={inp}>
                  <option value="">— Select your name —</option>
                  {staffList.map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                </select>
              : <input type="text" value={caregiverName} onChange={e=>setCaregiverName(e.target.value)} placeholder="Your first and last name" className={inp} />
            }
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client (optional)</label>
            {residents.length > 0
              ? <select value={residentId} onChange={e=>{setResidentId(e.target.value);const r=residents.find(x=>x.id===e.target.value);if(r)setClientName(`${r.first_name} ${r.last_name}`);}} className={inp}>
                  <option value="">— Select client —</option>
                  {residents.map(r=><option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
                </select>
              : <input type="text" value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="Client's full name" className={inp} />
            }
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date</label>
              <input type="date" value={noteDate} onChange={e=>setNoteDate(e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Note Type</label>
              <select value={noteType} onChange={e=>setNoteType(e.target.value)} className={inp}>
                {NOTE_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Note *</label>
            <textarea value={standaloneNote} onChange={e=>setStandaloneNote(e.target.value)} rows={5}
              placeholder="Enter your note here..." className={`${inp} resize-none`} />
          </div>
        </div>
        <button onClick={handleSubmitNotesOnly} disabled={loading || !caregiverName || !standaloneNote.trim()}
          className="w-full rounded-2xl py-4 text-lg font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-lg"
          style={{ backgroundColor: color }}>
          {loading ? "Submitting…" : "📝 Submit Note"}
        </button>
        <button onClick={() => { setStep("select"); setError(null); }}
          className="w-full py-3 text-sm text-slate-500 hover:text-slate-700">
          ← Back
        </button>
      </div>
    </div>
  );

  // Messages with the office
  if (step === "messages") return (
    <div className="min-h-screen pb-12 flex flex-col" style={{ background: "#f0f4f8" }}><Hdr subtitle="Messages" />
      <div className="max-w-md mx-auto px-4 pt-5 flex-1 flex flex-col w-full">
        <div className="flex-1 space-y-3 mb-4 overflow-y-auto">
          {threadMessages.length === 0 ? (
            <p className="text-center text-sm text-slate-400 mt-8">No messages yet — send one to the office below.</p>
          ) : threadMessages.map(m => (
            <div key={m.id} className={`flex ${m.sender_role === "office" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm ${m.sender_role === "office" ? "bg-slate-200 text-slate-800" : "text-white"}`} style={m.sender_role !== "office" ? { backgroundColor: color } : undefined}>
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className="text-[11px] mt-1 opacity-70">{new Date(m.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pb-2">
          <input type="text" value={newMessageBody} onChange={e => setNewMessageBody(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") sendMessage(); }}
            placeholder="Type a message…" className={`${inp} flex-1`} />
          <button onClick={sendMessage} disabled={sendingMessage || !newMessageBody.trim()}
            className="px-5 rounded-xl font-bold text-white disabled:opacity-50" style={{ backgroundColor: color }}>
            Send
          </button>
        </div>
        <button onClick={() => setStep("select")} className="w-full py-3 text-sm text-slate-500 hover:text-slate-700">
          ← Back
        </button>
      </div>
    </div>
  );

  // Step: select caregiver / client / GPS
  return (
    <div className="min-h-screen pb-12" style={{ background: "#f0f4f8" }}><Hdr subtitle="Caregiver Portal" />
      <div className="max-w-md mx-auto px-4 pt-6 space-y-4">
        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Staff Member Name *</label>
            {staffList.length > 0
              ? <select value={staffId} onChange={e=>{setStaffId(e.target.value);const s=staffList.find(x=>x.id===e.target.value);if(s)setCaregiverName(`${s.first_name} ${s.last_name}`);}} className={inp}>
                  <option value="">— Select your name —</option>
                  {staffList.map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                </select>
              : <input type="text" value={caregiverName} onChange={e=>setCaregiverName(e.target.value)} placeholder="Your first and last name" className={inp} />
            }
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client Name (optional)</label>
            {residents.length > 0
              ? <select value={residentId} onChange={e=>{setResidentId(e.target.value);const r=residents.find(x=>x.id===e.target.value);if(r)setClientName(`${r.first_name} ${r.last_name}`);}} className={inp}>
                  <option value="">— Select client —</option>
                  {residents.map(r=><option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
                </select>
              : <input type="text" value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="Client's full name" className={inp} />
            }
          </div>

          {/* Show client address when selected */}
          {selectedResident?.address && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
              <span className="font-semibold">📍 Clock in at: </span>{selectedResident.address}
            </div>
          )}

          <div>
            {gpsStatus==="idle" && <button type="button" onClick={getGPS} className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 text-sm text-slate-600 hover:border-blue-400 hover:text-blue-700 transition-colors">📍 Tap to capture GPS location</button>}
            {gpsStatus==="getting" && <p className="text-sm text-blue-600 py-2">📍 Getting location…</p>}
            {gpsStatus==="got" && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">✓ Location captured ({coords?.lat.toFixed(4)}, {coords?.lng.toFixed(4)})</div>}
            {gpsStatus==="denied" && <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">⚠ No GPS — visit will be recorded without location</div>}
          </div>
        </div>

        <button onClick={handleClockIn} disabled={loading||!caregiverName}
          className="w-full rounded-2xl py-4 text-lg font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg"
          style={{ backgroundColor: color }}>
          {loading ? "Clocking in…" : "🟢 Clock In"}
        </button>

        <div className="relative flex items-center gap-3">
          <div className="flex-1 border-t border-slate-300" />
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">or</span>
          <div className="flex-1 border-t border-slate-300" />
        </div>

        <button onClick={() => { setError(null); setStep("notes_only"); }}
          className="w-full rounded-2xl py-3.5 text-base font-bold border-2 border-slate-300 text-slate-700 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-colors">
          📝 Submit Notes Only
        </button>

        <button onClick={() => { if (!staffId) { setError("Select your name from the list above to message the office."); return; } setError(null); setStep("messages"); }}
          className="w-full rounded-2xl py-3.5 text-base font-bold border-2 border-slate-300 text-slate-700 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-colors">
          💬 Message the Office
        </button>
      </div>
    </div>
  );
}
