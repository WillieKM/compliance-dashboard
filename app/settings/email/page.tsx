"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

type SmtpConfig = {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_from_name: string;
  smtp_from_email: string;
};

export default function EmailSettingsPage() {
  const [config, setConfig] = useState<SmtpConfig>({
    smtp_host: "", smtp_port: 587, smtp_user: "",
    smtp_pass: "", smtp_from_name: "", smtp_from_email: "",
  });
  const [testTo, setTestTo]     = useState("");
  const [saving, setSaving]     = useState(false);
  const [testing, setTesting]   = useState(false);
  const [msg, setMsg]           = useState<{ ok: boolean; text: string } | null>(null);
  const [testMsg, setTestMsg]   = useState<{ ok: boolean; text: string } | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [preset, setPreset]     = useState("");
  const [orgId, setOrgId]       = useState<string | null>(null);
  const [orgName, setOrgName]   = useState<string | null>(null);
  const [addonStatus, setAddonStatus] = useState<string | null>(null);
  const [addonNote, setAddonNote]     = useState("");
  const [addonBusy, setAddonBusy]     = useState(false);
  const [addonMsg, setAddonMsg]       = useState<{ ok: boolean; text: string } | null>(null);
  const editedRef = useRef(false);

  // Read from URL after mount (avoids useSearchParams Suspense requirement)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlOrgId = params.get("orgId");
    setOrgId(urlOrgId);
    setOrgName(params.get("orgName"));

    const qs = urlOrgId ? `?orgId=${urlOrgId}` : "";
    fetch(`/api/org/email-settings${qs}`)
      .then(r => r.ok ? r.json() : {})
      .then(d => {
        // Skip if the user already started typing — don't clobber in-progress
        // edits with the (possibly all-null) saved row once this resolves.
        if (editedRef.current) return;
        setConfig(prev => ({ ...prev, ...d }));
      });
  }, []);

  useEffect(() => {
    fetch("/api/org/email-addon")
      .then(r => r.ok ? r.json() : {})
      .then((d: { email_addon_status?: string; email_addon_note?: string }) => {
        setAddonStatus(d.email_addon_status ?? null);
        setAddonNote(d.email_addon_note ?? "");
      });
  }, []);

  function updateConfig(patch: Partial<SmtpConfig>) {
    editedRef.current = true;
    setConfig(c => ({ ...c, ...patch }));
  }

  async function handleRequestAddon(e: React.FormEvent) {
    e.preventDefault();
    setAddonBusy(true);
    setAddonMsg(null);
    const res = await fetch("/api/org/email-addon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: addonNote }),
    });
    const data = await res.json();
    if (data.error) {
      setAddonMsg({ ok: false, text: data.error });
    } else {
      setAddonStatus("requested");
      setAddonMsg({ ok: true, text: "Request received — we'll be in touch to set this up." });
    }
    setAddonBusy(false);
  }

  async function handleCancelAddon() {
    setAddonBusy(true);
    setAddonMsg(null);
    const res = await fetch("/api/org/email-addon", { method: "DELETE" });
    const data = await res.json();
    if (data.error) {
      setAddonMsg({ ok: false, text: data.error });
    } else {
      setAddonStatus("cancelled");
      setAddonMsg({ ok: true, text: "Request cancelled." });
    }
    setAddonBusy(false);
  }

  function applyPreset(value: string) {
    setPreset(value);
    if (value === "gmail") {
      updateConfig({ smtp_host: "smtp.gmail.com", smtp_port: 587 });
    } else if (value === "outlook") {
      updateConfig({ smtp_host: "smtp.office365.com", smtp_port: 587 });
    } else if (value === "yahoo") {
      updateConfig({ smtp_host: "smtp.mail.yahoo.com", smtp_port: 587 });
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/org/email-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...config, orgId }),
    });
    const data = await res.json();
    setMsg(data.error ? { ok: false, text: data.error } : { ok: true, text: "Email settings saved successfully." });
    setSaving(false);
  }

  async function handleTest(e: React.FormEvent) {
    e.preventDefault();
    if (!testTo) return;
    setTesting(true);
    setTestMsg(null);
    const res = await fetch("/api/org/email-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: testTo, ...config }),
    });
    const data = await res.json();
    setTestMsg(data.error ? { ok: false, text: data.error } : { ok: true, text: `Test email sent to ${testTo}. Check your inbox!` });
    setTesting(false);
  }

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/settings/branding" className="text-sm text-blue-600 hover:underline">← Back to Settings</Link>
        <h1 className="text-3xl font-bold text-slate-900 mt-4">Email Settings</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Configure your agency's email so all system emails (shift assignments, reminders, onboarding) send from your official address.
        </p>
      </div>

      {orgId && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
          <strong>Super-admin mode:</strong> you're editing email settings for{" "}
          <strong>{orgName ?? orgId}</strong>, not your own organization.
        </div>
      )}

      {/* Branded Email Setup add-on — self-view only */}
      {!orgId && (
        <div className="rounded-2xl border border-blue-200 bg-white shadow-sm p-5 space-y-4">
          <div>
            <h2 className="font-bold text-slate-900">Branded Email Setup</h2>
            <p className="text-sm text-slate-500 mt-1">
              Don't want to deal with SMTP yourself? For $10/mo, our team configures your
              branded sending address for you — no technical setup required.
            </p>
          </div>

          {addonMsg && (
            <div className={`rounded-lg p-3 text-sm ${addonMsg.ok ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-700"}`}>
              {addonMsg.text}
            </div>
          )}

          {addonStatus === "requested" ? (
            <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-sm text-blue-800">Request received — our team will reach out to set this up.</p>
              <button onClick={handleCancelAddon} disabled={addonBusy}
                className="text-xs font-semibold text-blue-700 hover:underline shrink-0 ml-3">
                Cancel
              </button>
            </div>
          ) : addonStatus === "active" ? (
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 p-3">
              <p className="text-sm text-emerald-800 font-semibold">Active</p>
              <button onClick={handleCancelAddon} disabled={addonBusy}
                className="text-xs font-semibold text-emerald-700 hover:underline shrink-0 ml-3">
                Cancel
              </button>
            </div>
          ) : (
            <form onSubmit={handleRequestAddon} className="space-y-3">
              <textarea value={addonNote} onChange={e => setAddonNote(e.target.value)}
                placeholder="What address or domain would you like emails to send from? (e.g. info@youragency.com)"
                rows={2} className={inp} />
              <button type="submit" disabled={addonBusy}
                className="rounded-xl px-5 py-2.5 bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60">
                {addonBusy ? "Submitting…" : "Request Branded Email Setup — $10/mo"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* How it works */}
      <div className="rounded-2xl bg-blue-50 border border-blue-200 p-5">
        <p className="font-bold text-blue-900 mb-2">How this works</p>
        <ul className="text-sm text-blue-800 space-y-1.5 list-disc list-inside">
          <li>Enter your email provider's SMTP settings below.</li>
          <li>All emails from your platform (shift assignments, clock-in reminders, staff onboarding) will send from <strong>your email address</strong>.</li>
          <li>For Gmail, you need to create an <strong>App Password</strong> (not your regular password) — see instructions below.</li>
          <li>Save your settings, then send a test email to confirm it's working.</li>
        </ul>
      </div>

      {/* Gmail App Password instructions */}
      <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <summary className="px-5 py-4 cursor-pointer font-semibold text-slate-800 flex items-center gap-2">
          <span>📘</span> How to get a Gmail App Password (step by step)
        </summary>
        <div className="px-5 pb-5 text-sm text-slate-700 space-y-2 border-t border-slate-100 pt-4">
          <ol className="list-decimal list-inside space-y-2">
            <li>Sign in to your Google Account at <strong>myaccount.google.com</strong></li>
            <li>Click <strong>Security</strong> in the left menu</li>
            <li>Under "How you sign in to Google," enable <strong>2-Step Verification</strong> if not already on</li>
            <li>Search for <strong>App passwords</strong> in the search bar at the top</li>
            <li>Click App passwords → Name it <em>"CareCompliance"</em> → Click <strong>Create</strong></li>
            <li>Google shows a 16-character password — <strong>copy it</strong> and paste it below as your password</li>
            <li>Set SMTP Host to <code className="bg-slate-100 px-1 rounded">smtp.gmail.com</code> and Port to <code className="bg-slate-100 px-1 rounded">587</code></li>
          </ol>
          <p className="mt-2 text-slate-500">Your Gmail login email goes in "Username" and the 16-char App Password in "Password."</p>
        </div>
      </details>

      {/* Settings form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
        <h2 className="font-bold text-slate-900 border-b border-slate-100 pb-3">SMTP Configuration</h2>

        {msg && (
          <div className={`rounded-lg p-3 text-sm ${msg.ok ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-700"}`}>
            {msg.text}
          </div>
        )}

        {/* Quick-fill presets */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Quick Setup — choose your provider</label>
          <select value={preset} onChange={e => applyPreset(e.target.value)} className={inp}>
            <option value="">Custom / Manual</option>
            <option value="gmail">Gmail (smtp.gmail.com)</option>
            <option value="outlook">Outlook / Office 365</option>
            <option value="yahoo">Yahoo Mail</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">SMTP Host</label>
            <input type="text" value={config.smtp_host} onChange={e => updateConfig({ smtp_host: e.target.value })}
              placeholder="smtp.gmail.com" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Port</label>
            <input type="number" value={config.smtp_port} onChange={e => updateConfig({ smtp_port: Number(e.target.value) })}
              placeholder="587" className={inp} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Username (your email address)</label>
          <input type="email" value={config.smtp_user} onChange={e => updateConfig({ smtp_user: e.target.value })}
            placeholder="yourname@youragency.com" className={inp} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password (App Password for Gmail)</label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={config.smtp_pass}
              onChange={e => updateConfig({ smtp_pass: e.target.value })}
              placeholder="16-character app password"
              className={`${inp} pr-16`}
            />
            <button type="button" onClick={() => setShowPass(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-800">
              {showPass ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">From Name (displayed to recipients)</label>
            <input type="text" value={config.smtp_from_name} onChange={e => updateConfig({ smtp_from_name: e.target.value })}
              placeholder="Your Agency Name" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">From Email</label>
            <input type="email" value={config.smtp_from_email} onChange={e => updateConfig({ smtp_from_email: e.target.value })}
              placeholder="info@youragency.com" className={inp} />
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full rounded-xl py-3 bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-60">
          {saving ? "Saving…" : "Save Email Settings"}
        </button>
      </form>

      {/* Test email */}
      <form onSubmit={handleTest} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-slate-900 border-b border-slate-100 pb-3">Send a Test Email</h2>
        <p className="text-sm text-slate-500">After saving your settings above, send a test to confirm everything is working.</p>

        {testMsg && (
          <div className={`rounded-lg p-3 text-sm ${testMsg.ok ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-700"}`}>
            {testMsg.text}
          </div>
        )}

        <div className="flex gap-3">
          <input type="email" value={testTo} onChange={e => setTestTo(e.target.value)}
            required placeholder="your@email.com" className={`${inp} flex-1`} />
          <button type="submit" disabled={testing || !testTo}
            className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-900 disabled:opacity-60 shrink-0">
            {testing ? "Sending…" : "Send Test"}
          </button>
        </div>
      </form>
    </div>
  );
}
