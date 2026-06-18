"use client";

import { useState } from "react";

export default function EmailLetterButton({
  staffId,
  staffEmail,
}: {
  staffId: string;
  staffEmail: string | null;
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  if (!staffEmail) return null;

  async function handleSend() {
    setState("sending");
    setErrMsg("");
    const res  = await fetch(`/api/staff/${staffId}/email-letter`, { method: "POST" });
    const data = await res.json();
    if (data.error) {
      setErrMsg(data.error);
      setState("error");
    } else {
      setState("sent");
    }
  }

  if (state === "sent") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-4 py-2 text-sm font-semibold">
        ✅ Letter emailed to {staffEmail}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSend}
        disabled={state === "sending"}
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {state === "sending" ? "Sending…" : "✉ Email Letter + Sign Link"}
      </button>
      {state === "error" && (
        <p className="text-xs text-red-600">{errMsg}</p>
      )}
    </div>
  );
}
