"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Staff    = { id: string; first_name: string; last_name: string; role: string | null };
type Resident = { id: string; first_name: string; last_name: string };
type Match    = { id: string; name: string; role: string | null; score: number; reasons: string[] };

const CARE_TYPES = [
  { value: "home_care_visit",   label: "Home Care Visit" },
  { value: "personal_care",     label: "Personal Care" },
  { value: "skilled_nursing",   label: "Skilled Nursing" },
  { value: "therapy",           label: "Therapy" },
  { value: "companionship",     label: "Companionship" },
  { value: "medication_assist", label: "Medication Assist" },
  { value: "housekeeping",      label: "Housekeeping" },
  { value: "other",             label: "Other" },
];

export default function ShiftForm({
  staff, residents, action, backHref, navy,
}: {
  staff: Staff[];
  residents: Resident[];
  action: (formData: FormData) => void;
  backHref: string;
  navy: string;
}) {
  const [residentId, setResidentId] = useState("");
  const [date, setDate]             = useState(new Date().toISOString().split("T")[0]);
  const [careType, setCareType]     = useState("home_care_visit");
  const [startTime, setStartTime]   = useState("");
  const [endTime, setEndTime]       = useState("");
  const [staffId, setStaffId]       = useState("");
  const [matches, setMatches]       = useState<Match[] | null>(null);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [loadingMatches, setLoadingMatches] = useState(false);

  useEffect(() => {
    if (staff.length === 0) return;
    let cancelled = false;
    setLoadingMatches(true);
    fetch("/api/schedule/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ residentId: residentId || null, careType, date, startTime: startTime || null, endTime: endTime || null }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data) return;
        setMatches(data.available);
        setHiddenCount(data.conflictedCount ?? 0);
        setStaffId(prev => (data.available.some((m: Match) => m.id === prev) ? prev : data.available[0]?.id ?? ""));
      })
      .finally(() => { if (!cancelled) setLoadingMatches(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residentId, careType, date, startTime, endTime]);

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const candidates = matches ?? staff.map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}`, role: s.role, score: 0, reasons: [] as string[] }));

  return (
    <form action={action} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Client */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client</label>
          {residents.length > 0
            ? <select name="resident_id" value={residentId} onChange={e => setResidentId(e.target.value)} className={inp}>
                <option value="">— Select client —</option>
                {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
              </select>
            : <input type="text" name="client_name" placeholder="Client name" className={inp} />}
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date *</label>
          <input type="date" name="scheduled_date" required value={date} onChange={e => setDate(e.target.value)} className={inp} />
        </div>

        {/* Recurrence */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Repeat</label>
          <select name="recurrence" className={inp} defaultValue="none">
            <option value="none">One-time (no repeat)</option>
            <option value="daily">Daily (7 days)</option>
            <option value="weekly">Weekly (4 weeks)</option>
            <option value="biweekly">Every 2 weeks (4 occurrences)</option>
          </select>
        </div>

        {/* Times */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start Time</label>
          <input type="time" name="start_time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inp} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">End Time</label>
          <input type="time" name="end_time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inp} />
        </div>

        {/* Care type */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Visit Type</label>
          <select name="care_type" value={careType} onChange={e => setCareType(e.target.value)} className={inp}>
            {CARE_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* Caregiver — ranked matches, or a plain text fallback with no staff on file */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Caregiver *</label>
          {staff.length === 0 ? (
            <input type="text" name="caregiver_name" required placeholder="Caregiver name" className={inp} />
          ) : (
            <>
              <input type="hidden" name="staff_id" value={staffId} />
              {loadingMatches && <p className="text-xs text-slate-400 mb-1.5">Ranking caregivers…</p>}
              <div className="space-y-1.5">
                {candidates.map(m => (
                  <label key={m.id}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${staffId === m.id ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
                    <span className="flex items-center gap-2">
                      <input type="radio" checked={staffId === m.id} onChange={() => setStaffId(m.id)} className="accent-blue-600" />
                      <span className="text-sm font-semibold text-slate-900">{m.name}{m.role ? ` (${m.role})` : ""}</span>
                    </span>
                    <span className="flex gap-1 flex-wrap justify-end">
                      {m.reasons.map(r => (
                        <span key={r} className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">{r}</span>
                      ))}
                    </span>
                  </label>
                ))}
              </div>
              {hiddenCount > 0 && (
                <p className="text-xs text-amber-600 mt-2">⚠ {hiddenCount} caregiver{hiddenCount > 1 ? "s" : ""} hidden — already booked at this time.</p>
              )}
            </>
          )}
        </div>

        {/* Notes */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
          <textarea name="notes" rows={2} placeholder="Special instructions, supplies needed, etc." className={`${inp} resize-none`} />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={staff.length > 0 && !staffId}
          className="px-8 py-3 rounded-xl text-white font-bold hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: navy }}>
          Save Shift
        </button>
        <Link href={backHref} className="px-6 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">
          Cancel
        </Link>
      </div>
    </form>
  );
}
