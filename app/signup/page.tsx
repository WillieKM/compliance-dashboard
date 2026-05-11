"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const CARE_SETTING_OPTIONS = [
  { id: "HOME_CARE",      label: "Home Care Agency",       icon: "🏥", desc: "Medicare/Medicaid home health" },
  { id: "AFH",            label: "Adult Family Home",      icon: "🏠", desc: "State-licensed residential care" },
  { id: "ASSISTED_LIVING",label: "Assisted Living",        icon: "🏢", desc: "Licensed facility with personal care" },
  { id: "MULTI_SERVICE",  label: "Multi-Service Agency",   icon: "🌐", desc: "Multiple care service lines" },
];

function SignupForm() {
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [done, setDone]                     = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<string>("HOME_CARE");
  const [inviteCode, setInviteCode]         = useState("");
  const [codeValid, setCodeValid]           = useState<boolean | null>(null);
  const [codeChecking, setCodeChecking]     = useState(false);
  const [prefilledCompany, setPrefilledCompany] = useState("");

  async function validateCode(code: string) {
    if (!code.trim()) { setCodeValid(null); return; }
    setCodeChecking(true);
    const { data } = await supabase
      .from("invite_codes")
      .select("id, created_for, care_setting, used, expires_at")
      .eq("code", code.toUpperCase().trim())
      .maybeSingle();
    if (!data || data.used || (data.expires_at && new Date(data.expires_at) < new Date())) {
      setCodeValid(false);
    } else {
      setCodeValid(true);
      if (data.created_for)  setPrefilledCompany(data.created_for);
      if (data.care_setting) setSelectedSetting(data.care_setting);
    }
    setCodeChecking(false);
  }

  // Read invite code from URL after mount (avoids useSearchParams Suspense requirement)
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      setInviteCode(code);
      validateCode(code);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!selectedSetting) {
      setError("Please select your care setting.");
      return;
    }

    // Validate invite code
    if (!inviteCode.trim()) {
      setError("An invite code is required to sign up.");
      setLoading(false);
      return;
    }
    const { data: codeRow } = await supabase
      .from("invite_codes")
      .select("id, used, expires_at")
      .eq("code", inviteCode.toUpperCase().trim())
      .maybeSingle();

    if (!codeRow) {
      setError("Invalid invite code. Please check with your administrator.");
      setLoading(false);
      return;
    }
    if (codeRow.used) {
      setError("This invite code has already been used.");
      setLoading(false);
      return;
    }
    if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
      setError("This invite code has expired. Please request a new one.");
      setLoading(false);
      return;
    }

    setLoading(true);
    const form = new FormData(e.currentTarget);
    const companyName = String(form.get("company_name") || "").trim();
    const fullName    = String(form.get("full_name") || "").trim();
    const email       = String(form.get("email") || "").trim();
    const password    = String(form.get("password") || "").trim();

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    // 1 — Create auth user (with 15s timeout to prevent hanging)
    const timeout = new Promise<{ error: { message: string } }>(res =>
      setTimeout(() => res({ error: { message: "Request timed out. Please try again." } }), 15000)
    );

    const { error: signUpError } = await Promise.race([
      supabase.auth.signUp({
        email,
        password,
        options: {
          data: { company_name: companyName, full_name: fullName || email },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      }),
      timeout,
    ]);

    if (signUpError) {
      setError(signUpError.message.includes("already")
        ? "This email is already registered. Please use a different email."
        : signUpError.message);
      setLoading(false);
      return;
    }

    // 2 — Fire all post-signup work in background, never block the UI
    setTimeout(async () => {
      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("organization_id")
          .maybeSingle();

        if (profileData?.organization_id) {
          await supabase
            .from("organizations")
            .update({ care_settings: [selectedSetting] })
            .eq("id", profileData.organization_id);
        }
      } catch {}

      fetch("/api/admin/invites/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode.toUpperCase().trim(), usedBy: email }),
      }).catch(() => {});
    }, 2000);

    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow border border-slate-100 p-10">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Account created!</h2>
          <p className="text-slate-500 mb-6">Your account is ready. Sign in now to access your dashboard.</p>
          <Link
            href="/login"
            className="inline-block w-full rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 text-center"
          >
            Go to Login →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">CareCompliance</h1>
          <p className="mt-2 text-slate-500">Create your agency account</p>
        </div>

        <form onSubmit={handleSignup} className="bg-white rounded-2xl shadow border border-slate-100 p-8 space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          {/* Invite code — first field */}
          <div className={`rounded-xl border-2 p-4 ${codeValid === true ? "border-emerald-400 bg-emerald-50" : codeValid === false ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
            <label className="block text-sm font-bold text-slate-800 mb-1.5">
              🔑 Invite Code <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-slate-500 mb-3">Required — get this from your administrator</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteCode}
                onChange={e => { setInviteCode(e.target.value.toUpperCase()); setCodeValid(null); }}
                onBlur={e => validateCode(e.target.value)}
                placeholder="e.g. ABCD1234"
                maxLength={8}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 font-mono font-bold text-center text-lg tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="button" onClick={() => validateCode(inviteCode)}
                disabled={codeChecking || !inviteCode}
                className="px-4 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                {codeChecking ? "…" : "Check"}
              </button>
            </div>
            {codeValid === true && <p className="text-emerald-700 text-xs font-semibold mt-2">✓ Valid code{prefilledCompany ? ` — prepared for ${prefilledCompany}` : ""}</p>}
            {codeValid === false && <p className="text-red-600 text-xs font-semibold mt-2">✕ Invalid, used, or expired code</p>}
          </div>

          {/* Basic info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Company / Agency Name <span className="text-red-500">*</span>
              </label>
              <input type="text" name="company_name" required placeholder="e.g. Benmarr Home Care"
                defaultValue={prefilledCompany}
                key={prefilledCompany}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="mt-1 text-xs text-slate-400">Appears on your dashboard and reports.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Full Name</label>
              <input type="text" name="full_name" placeholder="Jane Smith"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input type="email" name="email" required placeholder="admin@agency.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <input type="password" name="password" required minLength={8} placeholder="Min. 8 characters"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Care setting selector — single choice */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Care Setting <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-slate-400 mb-3">
              Select the type of care your agency provides.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CARE_SETTING_OPTIONS.map((opt) => {
                const selected = selectedSetting === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedSetting(opt.id)}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${
                      selected
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}>
                        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <span className="text-xl">{opt.icon}</span>
                      <span className={`text-sm font-bold ${selected ? "text-blue-700" : "text-slate-700"}`}>
                        {opt.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 pl-7">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !selectedSetting || codeValid !== true}
            className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading ? "Creating your account…" : "Create Account"}
          </button>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return <SignupForm />;
}
