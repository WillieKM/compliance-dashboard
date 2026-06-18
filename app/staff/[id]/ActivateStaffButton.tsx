"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ActivateStaffButton({ staffId }: { staffId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleActivate() {
    setLoading(true);
    const res  = await fetch(`/api/staff/${staffId}/activate`, { method: "POST" });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
      setLoading(false);
    } else {
      router.push(`/staff/${staffId}/welcome-letter`);
    }
  }

  return (
    <button
      onClick={handleActivate}
      disabled={loading}
      className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 text-sm disabled:opacity-60"
    >
      {loading ? "Activating…" : "✓ Activate Staff"}
    </button>
  );
}
