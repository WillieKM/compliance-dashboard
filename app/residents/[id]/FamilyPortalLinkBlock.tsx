"use client";

import { useState } from "react";

export default function FamilyPortalLinkBlock({ residentId, initialToken }: { residentId: string; initialToken: string | null }) {
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    const res = await fetch(`/api/residents/${residentId}/family-portal`, { method: "POST" });
    const data = await res.json();
    if (data.token) setToken(data.token);
    setLoading(false);
  }

  function copyLink() {
    if (!token) return;
    navigator.clipboard.writeText(`${window.location.origin}/family-portal/${token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 mb-6">
      <h2 className="text-lg font-bold mb-1">Family Portal Link</h2>
      <p className="text-sm text-slate-500 mb-3">Share this link with family — they can view upcoming/recent visits and message the office. No login required.</p>
      {token ? (
        <div className="flex items-center gap-2 flex-wrap">
          <a href={`/family-portal/${token}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-mono text-xs break-all">
            {`${typeof window !== "undefined" ? window.location.origin : ""}/family-portal/${token}`}
          </a>
          <button onClick={copyLink} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      ) : (
        <button onClick={generate} disabled={loading}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
          {loading ? "Generating…" : "Generate Link"}
        </button>
      )}
    </div>
  );
}
