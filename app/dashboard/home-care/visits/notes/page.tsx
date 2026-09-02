"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const navy = "#1a3a52";
const gold = "#d4a574";

type Step = "form" | "done";

export default function CaregiverNotesPage() {
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [caregiverName, setCaregiverName] = useState("");
  const [staffId, setStaffId] = useState("");
  const [clientName, setClientName] = useState("");
  const [residentId, setResidentId] = useState("");
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split("T")[0]);
  const [noteType, setNoteType] = useState("Visit Note");
  const [notes, setNotes] = useState("");

  const [staffList, setStaffList] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [residents, setResidents] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [savedId, setSavedId] = useState("");

  useEffect(() => {
    async function load() {
      const { data: profile } = await supabase.from("profiles").select("facility_id").maybeSingle();
      if (!profile?.facility_id) return;
      const [sRes, rRes] = await Promise.all([
        supabase.from("staff").select("id, first_name, last_name").eq("facility_id", profile.facility_id).order("first_name"),
        supabase.from("residents").select("id, first_name, last_name").eq("facility_id", profile.facility_id).order("first_name"),
      ]);
      setStaffList(sRes.data ?? []);
      setResidents(rRes.data ?? []);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!caregiverName || !clientName || !notes.trim()) {
      setError("Caregiver name, client name, and notes are required.");
      return;
    }
    setLoading(true);
    setError(null);

    const { data: profile } = await supabase.from("profiles").select("facility_id").maybeSingle();
    if (!profile?.facility_id) { setError("Not logged in."); setLoading(false); return; }

    // Save as a visit record with no clock-in/out (notes-only entry)
    const { data: visit, error: vErr } = await supabase.from("care_visits").insert({
      facility_id: profile.facility_id,
      staff_id: staffId || null,
      resident_id: residentId || null,
      caregiver_name: caregiverName,
      client_name: clientName,
      care_setting: "HOME_CARE",
      clock_in_time: `${noteDate}T00:00:00Z`,
      status: "completed",
      notes: `[${noteType}] ${notes}`,
    }).select().single();

    if (vErr || !visit) { setError(vErr?.message ?? "Failed to save"); setLoading(false); return; }

    // Save as a service report so it appears in visit detail
    await supabase.from("visit_service_reports").insert({
      visit_id: visit.id,
      facility_id: profile.facility_id,
      caregiver_notes: notes,
      mood_demeanor: "",
      adl_checklist: [],
      submitted_at: new Date().toISOString(),
    });

    setSavedId(visit.id.slice(0, 8).toUpperCase());
    setStep("done");
    setLoading(false);
  }

  const inp = "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

  if (step === "done") return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f0f4f8" }}>
      <div className="max-w-sm w-full text-center bg-white rounded-2xl shadow-lg border border-slate-200 p-10">
        <p className="text-5xl mb-4">📝</p>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Note Saved!</h2>
        <p className="text-slate-500 mb-2">Note for <strong>{clientName}</strong> submitted by <strong>{caregiverName}</strong></p>
        <p className="text-sm text-slate-400 mb-6">Note ID: N-{savedId}</p>
        <button
          onClick={() => { setStep("form"); setNotes(""); setClientName(""); setCaregiverName(""); setStaffId(""); setResidentId(""); }}
          className="w-full rounded-xl py-3 font-bold text-white hover:opacity-90"
          style={{ backgroundColor: navy }}
        >
          Submit Another Note
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-12" style={{ background: "#f0f4f8" }}>
      {/* Header */}
      <div className="text-white px-5 py-5" style={{ background: `linear-gradient(135deg, ${navy}, #274f6e)` }}>
        <h1 className="text-2xl font-bold">📝 Caregiver Notes</h1>
        <p className="text-white/70 text-sm mt-0.5">Submit notes for a client visit or observation</p>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            {/* Caregiver */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Name *</label>
              {staffList.length > 0 ? (
                <select value={staffId} onChange={(e) => {
                  setStaffId(e.target.value);
                  const s = staffList.find((x) => x.id === e.target.value);
                  if (s) setCaregiverName(`${s.first_name} ${s.last_name}`);
                }} className={inp}>
                  <option value="">— Select your name —</option>
                  {staffList.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                </select>
              ) : (
                <input type="text" value={caregiverName} onChange={(e) => setCaregiverName(e.target.value)}
                  placeholder="Your full name" className={inp} required />
              )}
            </div>

            {/* Client */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client Name *</label>
              {residents.length > 0 ? (
                <select value={residentId} onChange={(e) => {
                  setResidentId(e.target.value);
                  const r = residents.find((x) => x.id === e.target.value);
                  if (r) setClientName(`${r.first_name} ${r.last_name}`);
                }} className={inp}>
                  <option value="">— Select client —</option>
                  {residents.map((r) => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
                </select>
              ) : (
                <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client's full name" className={inp} required />
              )}
            </div>

            {/* Date + Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date</label>
                <input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Note Type</label>
                <select value={noteType} onChange={(e) => setNoteType(e.target.value)} className={inp}>
                  <option>Visit Note</option>
                  <option>Phone Call</option>
                  <option>Family Communication</option>
                  <option>Observation</option>
                  <option>Incident Follow-up</option>
                  <option>Medication Note</option>
                  <option>Care Plan Update</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border-2 border-amber-200 p-5 shadow-sm">
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              📝 Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={8}
              required
              placeholder="Write your notes here...&#10;&#10;e.g. Client was alert and cooperative. Assisted with morning routine and breakfast. Family member called to check in. Client mentioned mild knee pain — noted for next care plan review."
              className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">{notes.length} characters</p>
          </div>

          <button
            type="submit"
            disabled={loading || !caregiverName || !clientName || !notes.trim()}
            className="w-full rounded-2xl py-4 text-lg font-bold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg"
            style={{ backgroundColor: navy, color: "white" }}
          >
            {loading ? "Saving…" : "📝 Submit Note"}
          </button>
        </form>
      </div>
    </div>
  );
}
