"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  reportId: string;
  clearedBy?: string | null;
  clearedAt?: string | null;
  supervisorNotes?: string | null;
}

export default function NoteSignOffButton({ reportId, clearedBy, clearedAt, supervisorNotes }: Props) {
  const router = useRouter();
  const [open, setOpen]             = useState(false);
  const [supervisor, setSupervisor] = useState("");
  const [notes, setNotes]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  if (clearedBy) {
    return (
      <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 space-y-1">
        <p className="font-bold text-emerald-900">Signed off by Supervisor</p>
        <p>Supervisor: <strong>{clearedBy}</strong></p>
        {clearedAt && (
          <p>On: {new Date(clearedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
        )}
        {supervisorNotes && <p className="pt-1 border-t border-emerald-200">Notes: {supervisorNotes}</p>}
      </div>
    );
  }

  async function handleSignOff() {
    if (!supervisor.trim()) { setError("Supervisor name is required."); return; }
    setLoading(true); setError(null);
    const res = await fetch("/api/incidents/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, supervisorName: supervisor.trim(), supervisorNotes: notes.trim() || null }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    setLoading(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
      >
        Supervisor Sign-Off →
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
      <p className="text-xs font-bold text-slate-700">Supervisor Sign-Off</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input
        type="text"
        value={supervisor}
        onChange={e => setSupervisor(e.target.value)}
        placeholder="Supervisor name *"
        className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={2}
        placeholder="Sign-off notes (optional)..."
        className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSignOff}
          disabled={loading || !supervisor.trim()}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Mark as Reviewed"}
        </button>
        <button
          onClick={() => { setOpen(false); setError(null); }}
          className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
