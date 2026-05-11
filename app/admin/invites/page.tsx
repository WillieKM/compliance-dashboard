"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const CARE_SETTINGS = [
  { id: "HOME_CARE",       label: "🏥 Home Care" },
  { id: "AFH",             label: "🏠 Adult Family Home" },
  { id: "ASSISTED_LIVING", label: "🏢 Assisted Living" },
  { id: "MULTI_SERVICE",   label: "🌐 Multi-Service" },
];

type InviteCode = {
  id: string;
  code: string;
  created_for: string | null;
  care_setting: string | null;
  used: boolean;
  used_by: string | null;
  used_at: string | null;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
};

export default function InvitesPage() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // New code form
  const [createdFor, setCreatedFor]   = useState("");
  const [careSetting, setCareSetting] = useState("HOME_CARE");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [notes, setNotes]             = useState("");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  useEffect(() => { loadCodes(); }, []);

  async function loadCodes() {
    const { data } = await supabase
      .from("invite_codes")
      .select("*")
      .order("created_at", { ascending: false });
    setCodes(data ?? []);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ createdFor, careSetting, notes, expiresInDays: Number(expiresInDays) || null }),
    });
    const data = await res.json();
    if (!data.error) {
      setCodes(prev => [data, ...prev]);
      setCreatedFor(""); setNotes("");
    }
    setCreating(false);
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this invite code?")) return;
    await fetch("/api/admin/invites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setCodes(prev => prev.filter(c => c.id !== id));
  }

  function copyLink(code: string) {
    const link = `${appUrl}/signup?code=${code}`;
    navigator.clipboard.writeText(link);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  function isExpired(code: InviteCode) {
    return code.expires_at ? new Date(code.expires_at) < new Date() : false;
  }

  const active  = codes.filter(c => !c.used && !isExpired(c));
  const used    = codes.filter(c => c.used);
  const expired = codes.filter(c => !c.used && isExpired(c));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Invite Codes</h1>
        <p className="text-slate-500 text-sm mt-1">
          Generate a unique code for each new client. They enter it at signup — no code, no access.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active Codes",  count: active.length,  cls: "bg-emerald-50 border-emerald-200 text-emerald-800" },
          { label: "Used",          count: used.length,    cls: "bg-slate-50 border-slate-200 text-slate-600" },
          { label: "Expired",       count: expired.length, cls: "bg-red-50 border-red-200 text-red-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.count}</p>
            <p className="text-xs font-semibold mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Create new code */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="font-bold text-slate-900 mb-4">Generate New Invite Code</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company / Client Name *</label>
            <input type="text" value={createdFor} onChange={e => setCreatedFor(e.target.value)} required
              placeholder="e.g. Benmarr Home Care"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Care Setting</label>
            <select value={careSetting} onChange={e => setCareSetting(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {CARE_SETTINGS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Expires In (days)</label>
            <select value={expiresInDays} onChange={e => setExpiresInDays(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="">Never expires</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes (optional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Referred by John"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={creating || !createdFor}
              className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-60">
              {creating ? "Generating…" : "Generate Invite Code"}
            </button>
          </div>
        </form>
      </div>

      {/* Active codes */}
      {active.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-emerald-50">
            <h2 className="font-bold text-emerald-900">Active Codes ({active.length})</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {active.map(code => (
              <div key={code.id} className="flex items-start justify-between gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <code className="text-lg font-bold tracking-widest text-slate-900 font-mono">{code.code}</code>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {CARE_SETTINGS.find(s => s.id === code.care_setting)?.label ?? code.care_setting}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">{code.created_for}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {code.expires_at ? `Expires ${new Date(code.expires_at).toLocaleDateString()}` : "No expiry"}
                    {code.notes && ` · ${code.notes}`}
                  </p>
                  <div className="mt-2 flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-200 max-w-sm">
                    <code className="text-xs text-slate-600 truncate flex-1">{appUrl}/signup?code={code.code}</code>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => copyLink(code.code)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${copied === code.code ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-blue-700"}`}>
                    {copied === code.code ? "✓ Copied!" : "Copy Link"}
                  </button>
                  <button onClick={() => handleRevoke(code.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100">
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Used codes */}
      {used.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-slate-50">
            <h2 className="font-bold text-slate-700">Used Codes ({used.length})</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {used.map(code => (
              <div key={code.id} className="flex items-center justify-between p-4 opacity-70">
                <div>
                  <code className="font-mono font-bold text-slate-500 line-through">{code.code}</code>
                  <p className="text-sm text-slate-600">{code.created_for}</p>
                  <p className="text-xs text-slate-400">
                    Used by {code.used_by} · {code.used_at ? new Date(code.used_at).toLocaleDateString() : ""}
                  </p>
                </div>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">Used</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {codes.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
          <p className="text-4xl mb-3">🔑</p>
          <h3 className="font-bold text-slate-700 mb-1">No invite codes yet</h3>
          <p className="text-sm text-slate-500">Generate your first code above to invite a new client.</p>
        </div>
      )}
    </div>
  );
}
