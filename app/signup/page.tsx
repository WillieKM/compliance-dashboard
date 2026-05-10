"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const CARE_SETTING_OPTIONS = [
  { id: "HOME_CARE",      label: "Home Care Agency",       icon: "🏥", desc: "Medicare/Medicaid home health" },
  { id: "AFH",            label: "Adult Family Home",      icon: "🏠", desc: "State-licensed residential care" },
  { id: "ASSISTED_LIVING",label: "Assisted Living",        icon: "🏢", desc: "Licensed facility with personal care" },
  { id: "MULTI_SERVICE",  label: "Multi-Service Agency",   icon: "🌐", desc: "Multiple care service lines" },
];

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [selectedSettings, setSelectedSettings] = useState<string[]>(["HOME_CARE"]);

  function toggleSetting(id: string) {
    setSelectedSettings((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (selectedSettings.length === 0) {
      setError("Please select at least one care setting.");
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

    // 1 — Create auth user
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { company_name: companyName, full_name: fullName || email },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // 2 — Wait briefly for the trigger to create the org, then save care_settings
    await new Promise((r) => setTimeout(r, 1500));

    const { data: profileData } = await supabase
      .from("profiles")
      .select("organization_id")
      .maybeSingle();

    if (profileData?.organization_id) {
      await supabase
        .from("organizations")
        .update({ care_settings: selectedSettings })
        .eq("id", profileData.organization_id);
    }

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

          {/* Basic info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Company / Agency Name <span className="text-red-500">*</span>
              </label>
              <input type="text" name="company_name" required placeholder="e.g. Benmarr Home Care"
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

          {/* Care settings selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Care Settings You Operate <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-slate-400 mb-3">
              Only the dashboards you select will appear in your account.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CARE_SETTING_OPTIONS.map((opt) => {
                const selected = selectedSettings.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleSetting(opt.id)}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${
                      selected
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{opt.icon}</span>
                      <span className={`text-sm font-bold ${selected ? "text-blue-700" : "text-slate-700"}`}>
                        {opt.label}
                      </span>
                      {selected && <span className="ml-auto text-blue-500 text-sm">✓</span>}
                    </div>
                    <p className="text-xs text-slate-400 pl-7">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || selectedSettings.length === 0}
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
