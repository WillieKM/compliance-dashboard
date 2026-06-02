"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type StaffMember = { id: string; first_name: string; last_name: string; email: string | null; role: string | null };
type Resident    = { id: string; first_name: string; last_name: string; address: string | null };

export default function NewShiftPage() {
  const router = useRouter();

  const [staffList, setStaffList]   = useState<StaffMember[]>([]);
  const [residents, setResidents]   = useState<Resident[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);

  const [staffId, setStaffId]       = useState("");
  const [residentId, setResidentId] = useState("");
  const [shiftDate, setShiftDate]   = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime]   = useState("08:00");
  const [endTime, setEndTime]       = useState("16:00");
  const [notes, setNotes]           = useState("");

  const selectedStaff    = staffList.find(s => s.id === staffId);
  const selectedResident = residents.find(r => r.id === residentId);

  useEffect(() => {
    async function load() {
      const [staffRes, resRes] = await Promise.all([
        fetch("/api/staff").then(r => r.ok ? r.json() : []).catch(() => []),
        fetch("/api/residents").then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      setStaffList(staffRes);
      setResidents(resRes);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!staffId || !shiftDate || !startTime) { setError("Caregiver, date, and start time are required."); return; }
    setLoading(true); setError(null);

    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId, residentId: residentId || null, shiftDate, startTime, endTime: endTime || null, notes: notes || null }),
    });

    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }

    setSuccess(true);
    setTimeout(() => router.push("/shifts"), 1500);
  }

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

  if (success) return (
    <div className="max-w-2xl">
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
        <p className="text-4xl mb-3">✅</p>
        <h2 className="text-xl font-bold text-emerald-900 mb-1">Shift Assigned!</h2>
        <p className="text-emerald-700 text-sm">
          {selectedStaff?.email ? `Email sent to ${selectedStaff.email}` : "Shift created (no email on file)"}
        </p>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/shifts" className="text-blue-600 hover:underline text-sm">← Back to Shifts</Link>
        <h1 className="text-3xl font-bold text-slate-900 mt-4">Assign New Shift</h1>
        <p className="text-slate-500 mt-1 text-sm">An email will be sent to the caregiver with the client address and a link to accept.</p>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">

        {/* Caregiver */}
        <div>
          <label className="block mb-1.5 font-semibold text-slate-700 text-sm">Caregiver *</label>
          <select value={staffId} onChange={e => setStaffId(e.target.value)} required className={inp}>
            <option value="">— Select caregiver —</option>
            {staffList.map(s => (
              <option key={s.id} value={s.id}>
                {s.first_name} {s.last_name}{s.role ? ` (${s.role})` : ""}
              </option>
            ))}
          </select>
          {selectedStaff && (
            <p className={`mt-1.5 text-xs ${selectedStaff.email ? "text-emerald-700" : "text-amber-600"}`}>
              {selectedStaff.email ? `📧 Email: ${selectedStaff.email}` : "⚠ No email on file — notification cannot be sent"}
            </p>
          )}
        </div>

        {/* Client */}
        <div>
          <label className="block mb-1.5 font-semibold text-slate-700 text-sm">Client / Resident</label>
          <select value={residentId} onChange={e => setResidentId(e.target.value)} className={inp}>
            <option value="">— Select client (optional) —</option>
            {residents.map(r => (
              <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
            ))}
          </select>
          {selectedResident?.address && (
            <p className="mt-1.5 text-xs text-blue-700">📍 Address: {selectedResident.address}</p>
          )}
          {selectedResident && !selectedResident.address && (
            <p className="mt-1.5 text-xs text-amber-600">⚠ No address on file for this client</p>
          )}
        </div>

        {/* Date and times */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block mb-1.5 font-semibold text-slate-700 text-sm">Date *</label>
            <input type="date" value={shiftDate} onChange={e => setShiftDate(e.target.value)} required className={inp} />
          </div>
          <div>
            <label className="block mb-1.5 font-semibold text-slate-700 text-sm">Start Time *</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required className={inp} />
          </div>
          <div>
            <label className="block mb-1.5 font-semibold text-slate-700 text-sm">End Time</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inp} />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block mb-1.5 font-semibold text-slate-700 text-sm">Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="e.g. Bring medication list, use back entrance…"
            className={`${inp} resize-none`} />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={loading || !staffId}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60 text-sm">
            {loading ? "Sending…" : selectedStaff?.email ? "Assign & Send Email" : "Assign Shift"}
          </button>
          <Link href="/shifts" className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-sm">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
