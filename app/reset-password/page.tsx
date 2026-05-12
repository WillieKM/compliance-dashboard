"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [ready, setReady]       = useState(false);
  const [success, setSuccess]   = useState(false);

  useEffect(() => {
    async function handleRecovery() {
      // The reset link contains tokens in the URL hash: #access_token=...&type=recovery
      const hash = window.location.hash;

      if (!hash) {
        // No hash — maybe already have a session (e.g. page refresh)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) { setReady(true); return; }
        setError("No reset token found. Please request a new reset link.");
        return;
      }

      const params = new URLSearchParams(hash.replace("#", ""));
      const accessToken  = params.get("access_token");
      const refreshToken = params.get("refresh_token") ?? "";
      const type         = params.get("type");

      if (type !== "recovery" || !accessToken) {
        setError("Invalid reset link. Please request a new one.");
        return;
      }

      // Exchange the token for an active session
      const { error: sessionError } = await supabase.auth.setSession({
        access_token:  accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        setError("Reset link has expired. Please request a new one.");
        return;
      }

      // Clear the hash from the URL so it can't be reused accidentally
      window.history.replaceState(null, "", window.location.pathname);
      setReady(true);
    }

    handleRecovery();
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  if (success) return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center bg-white rounded-2xl shadow border border-slate-100 p-10">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Password updated!</h2>
        <p className="text-slate-500">Redirecting to your dashboard…</p>
      </div>
    </div>
  );

  if (!ready) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center bg-white rounded-2xl shadow border border-slate-100 p-10">
        {error ? (
          <>
            <div className="text-4xl mb-4">🔗</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Reset link invalid</h2>
            <p className="text-red-600 text-sm mb-6">{error}</p>
            <Link href="/forgot-password"
              className="inline-block bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors">
              Request a New Reset Link →
            </Link>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Verifying reset link…</p>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">CareCompliance</h1>
          <p className="text-slate-500 mt-1 text-sm">Set your new password</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Create new password</h2>
          <p className="text-sm text-slate-500 mb-6">Choose a strong password for your account.</p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required minLength={8} placeholder="Min. 8 characters"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                required placeholder="Repeat your password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {confirm && password !== confirm && (
                <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
              )}
            </div>
            <button type="submit"
              disabled={loading || password !== confirm || password.length < 8}
              className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {loading ? "Saving…" : "Set New Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
