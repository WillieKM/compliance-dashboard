"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function AccountSettingsPage() {
  const [currentEmail, setCurrentEmail] = useState("");

  const [newEmail, setNewEmail]         = useState("");
  const [emailMsg, setEmailMsg]         = useState<{ ok: boolean; text: string } | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [pwMsg, setPwMsg]           = useState<{ ok: boolean; text: string } | null>(null);
  const [pwLoading, setPwLoading]   = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setCurrentEmail(data.user.email);
    });
  }, []);

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail || newEmail === currentEmail) return;
    setEmailLoading(true);
    setEmailMsg(null);

    const { error } = await supabase.auth.updateUser({ email: newEmail });

    if (error) {
      setEmailMsg({ ok: false, text: error.message });
    } else {
      setEmailMsg({ ok: true, text: `Confirmation email sent to ${newEmail}. Click the link in that email to complete the change.` });
      setNewEmail("");
    }
    setEmailLoading(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setPwMsg({ ok: false, text: "Passwords do not match." });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({ ok: false, text: "Password must be at least 8 characters." });
      return;
    }
    setPwLoading(true);
    setPwMsg(null);

    // Re-authenticate first to verify current password
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password: currentPw,
    });
    if (signInErr) {
      setPwMsg({ ok: false, text: "Current password is incorrect." });
      setPwLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) {
      setPwMsg({ ok: false, text: error.message });
    } else {
      setPwMsg({ ok: true, text: "Password updated successfully." });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    }
    setPwLoading(false);
  }

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">← Back to Dashboard</Link>
        <h1 className="text-3xl font-bold text-slate-900 mt-4">Account Settings</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage your login email and password.</p>
      </div>

      {/* Change email */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="font-bold text-slate-900">Email Address</h2>
          <p className="text-xs text-slate-400 mt-0.5">Current: <span className="font-mono">{currentEmail || "Loading…"}</span></p>
        </div>

        {emailMsg && (
          <div className={`rounded-lg p-3 text-sm ${emailMsg.ok ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-700"}`}>
            {emailMsg.text}
          </div>
        )}

        <form onSubmit={handleEmailChange} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Email Address</label>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              required
              placeholder="new@example.com"
              className={inp}
            />
          </div>
          <button
            type="submit"
            disabled={emailLoading || !newEmail}
            className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60"
          >
            {emailLoading ? "Sending…" : "Send Confirmation Email"}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-slate-900">Password</h2>

        {pwMsg && (
          <div className={`rounded-lg p-3 text-sm ${pwMsg.ok ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-700"}`}>
            {pwMsg.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Current Password</label>
            <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={8} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required className={inp} />
          </div>
          <button
            type="submit"
            disabled={pwLoading || !currentPw || !newPw || !confirmPw}
            className="px-6 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-900 disabled:opacity-60"
          >
            {pwLoading ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
