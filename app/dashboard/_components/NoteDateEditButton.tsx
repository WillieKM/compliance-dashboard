"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NoteDateEditButton({ visitId, currentDate }: { visitId: string; currentDate: string | null }) {
  const router = useRouter();
  const defaultDate = currentDate
    ? new Date(currentDate).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];
  const [open, setOpen]       = useState(false);
  const [date, setDate]       = useState(defaultDate);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/notes/adjust-date", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitId, newDate: date }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2.5 py-1 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
      >
        Edit Date
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
      <p className="text-xs font-bold text-slate-700">Adjust Note Date</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save Date"}
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
