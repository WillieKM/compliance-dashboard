"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteStaffButton({ staffId, staffName }: { staffId: string; staffName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const res = await fetch(`/api/staff/${staffId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/staff");
    } else {
      const data = await res.json();
      alert(data.error ?? "Delete failed. Please try again.");
      setLoading(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
      >
        Delete Staff
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
      <span className="text-sm text-red-700 font-medium">Delete {staffName}? This cannot be undone.</span>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60 shrink-0"
      >
        {loading ? "Deleting…" : "Yes, Delete"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50 shrink-0"
      >
        Cancel
      </button>
    </div>
  );
}
