"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type OrgBrand = { name: string; primary_color: string | null; logo_url: string | null; tagline: string | null };

export default function BrandedNotesPage() {
  const { slug } = useParams<{ slug: string }>();
  const [org, setOrg] = useState<OrgBrand | null>(null);
  const [caregiverName, setCaregiverName] = useState("");
  const [staffId, setStaffId] = useState("");
  const [clientName, setClientName] = useState("");
  const [residentId, setResidentId] = useState("");
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split("T")[0]);
  const [noteType, setNoteType] = useState("Visit Note");
  const [notes, setNotes] = useState("");
  const [staffList, setStaffList] = useState<{id:string;first_name:string;last_name:string}[]>([]);
  const [residents, setResidents] = useState<{id:string;first_name:string;last_name:string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    async function load() {
      const [orgData, staffData, resData] = await Promise.all([
        fetch(`/api/portal/${slug}/org`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/portal/${slug}/staff`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`/api/portal/${slug}/residents`).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      setOrg(orgData ?? { name: "Care Agency", primary_color: "#1a3a52", logo_url: null, tagline: null });
      setStaffList(staffData ?? []);
      setResidents(resData ?? []);
    }
    load();
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!caregiverName || !clientName || !notes.trim()) { setError("Name, client, and notes are required"); return; }
    setLoading(true); setError(null);
    const res = await fetch(`/api/portal/${slug}/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submit_notes",
        caregiverName, clientName, staffId: staffId||null, residentId: residentId||null,
        noteDate, noteType, notes,
      }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    setDone(true); setLoading(false);
  }

  if (!org) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const color = org.primary_color ?? "#1a3a52";
  const inp = "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2";

  if (done) return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      <div className="text-white px-5 py-4 flex items-center gap-3" style={{ backgroundColor: color }}>
        {org.logo_url ? <img src={org.logo_url} alt="" className="h-8 w-8 rounded object-contain" /> : <div className="h-8 w-8 rounded bg-white/20 flex items-center justify-center font-bold text-sm">{org.name.slice(0,2).toUpperCase()}</div>}
        <p className="font-bold">{org.name}</p>
      </div>
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-sm">
          <p className="text-5xl mb-4">📝</p>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Note Saved!</h2>
          <p className="text-slate-500 mb-6">Note for <strong>{clientName}</strong> submitted</p>
          <button onClick={() => { setDone(false); setNotes(""); setClientName(""); setCaregiverName(""); setStaffId(""); setResidentId(""); }}
            className="w-full rounded-xl py-3 font-bold text-white hover:opacity-90" style={{ backgroundColor: color }}>Submit Another Note</button>
          <Link href={`/portal/${slug}`} className="block mt-3 text-sm text-slate-400 hover:text-slate-600">Back to portal</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-12" style={{ background: "#f0f4f8" }}>
      <div className="text-white px-5 py-4 flex items-center gap-3" style={{ backgroundColor: color }}>
        {org.logo_url ? <img src={org.logo_url} alt="" className="h-8 w-8 rounded object-contain bg-white/10 p-0.5" /> : <div className="h-8 w-8 rounded bg-white/20 flex items-center justify-center font-bold text-sm">{org.name.slice(0,2).toUpperCase()}</div>}
        <div><p className="font-bold">{org.name}</p><p className="text-xs opacity-70">Caregiver Notes</p></div>
      </div>
      <div className="max-w-md mx-auto px-4 pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Name *</label>
              {staffList.length > 0 ? (
                <select value={staffId} onChange={e=>{setStaffId(e.target.value);const s=staffList.find(x=>x.id===e.target.value);if(s)setCaregiverName(`${s.first_name} ${s.last_name}`);}} className={inp}>
                  <option value="">— Select your name —</option>
                  {staffList.map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                </select>
              ) : <input type="text" value={caregiverName} onChange={e=>setCaregiverName(e.target.value)} placeholder="Your full name" className={inp} required />}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client Name *</label>
              {residents.length > 0 ? (
                <select value={residentId} onChange={e=>{setResidentId(e.target.value);const r=residents.find(x=>x.id===e.target.value);if(r)setClientName(`${r.first_name} ${r.last_name}`);}} className={inp}>
                  <option value="">— Select client —</option>
                  {residents.map(r=><option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
                </select>
              ) : <input type="text" value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="Client name" className={inp} required />}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Date</label><input type="date" value={noteDate} onChange={e=>setNoteDate(e.target.value)} className={inp} /></div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Note Type</label>
                <select value={noteType} onChange={e=>setNoteType(e.target.value)} className={inp}>
                  {["Visit Note","Phone Call","Family Communication","Observation","Incident Follow-up","Medication Note","Care Plan Update","Other"].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border-2 border-amber-200 p-5 shadow-sm">
            <label className="block text-sm font-semibold text-slate-900 mb-2">📝 Notes *</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={8} required
              placeholder="Write your notes here..." className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 resize-none" />
          </div>
          <button type="submit" disabled={loading||!caregiverName||!clientName||!notes.trim()}
            className="w-full rounded-2xl py-4 text-lg font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-lg" style={{ backgroundColor: color }}>
            {loading ? "Saving…" : "📝 Submit Note"}
          </button>
        </form>
      </div>
    </div>
  );
}
