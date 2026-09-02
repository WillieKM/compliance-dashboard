"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NoteDeleteButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/notes/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2.5 py-1 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
      <p className="text-xs font-bold text-red-800">Delete this note? This cannot be undone.</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? "Deleting…" : "Yes, Delete"}
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
