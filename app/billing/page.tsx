"use client";

import { useState, useEffect } from "react";
import { ALL_CARE_PLANS, CARE_SETTING_PLANS, type CarePlanId } from "@/lib/stripe";

export default function BillingPage() {
  const [loading, setLoading]   = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [orgName, setOrgName]   = useState<string>("");
  const [plans, setPlans]       = useState(ALL_CARE_PLANS);

  useEffect(() => {
    fetch("/api/org/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.org) return;
        setOrgName(data.org.name ?? "");
        const settings: CarePlanId[] = data.org.care_settings ?? [];
        if (settings.length > 0) {
          const filtered = ALL_CARE_PLANS.filter(p => settings.includes(p.id));
          setPlans(filtered.length > 0 ? filtered : ALL_CARE_PLANS);
        }
      })
      .catch(() => {});
  }, []);

  async function subscribe(settingId: string) {
    setLoading(settingId);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settingId }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setLoading(null); return; }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Billing & Plans</h1>
        <p className="text-slate-500 mt-2">
          {orgName
            ? <>Subscription plan for <strong>{orgName}</strong>. Cancel anytime.</>
            : <>Choose the plan for your care setting. Cancel anytime.</>}
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
      )}

      {plans.map(plan => (
        <div key={plan.id} className="bg-white rounded-2xl border-2 shadow-sm overflow-hidden"
          style={{ borderColor: plan.color + "40" }}>
          <div className="px-6 py-5 flex items-center justify-between flex-wrap gap-4"
            style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.color}dd)` }}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{plan.icon}</span>
              <div>
                <h2 className="text-xl font-bold text-white">{plan.label}</h2>
                <p className="text-white/70 text-xs mt-0.5">{plan.wac}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">${plan.price}</span>
                <span className="text-white/70 text-sm">/month</span>
              </div>
            </div>
          </div>

          <div className="p-6 flex flex-col sm:flex-row gap-6">
            <ul className="flex-1 space-y-2">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="text-emerald-500 font-bold mt-0.5 shrink-0">✓</span>{f}
                </li>
              ))}
            </ul>

            <div className="sm:w-48 flex flex-col justify-center gap-3">
              <button
                onClick={() => subscribe(plan.id)}
                disabled={loading !== null}
                className="w-full rounded-xl py-3 font-bold text-white text-sm hover:opacity-90 disabled:opacity-60 transition-all"
                style={{ backgroundColor: plan.color }}
              >
                {loading === plan.id ? "Redirecting…" : `Subscribe — $${plan.price}/mo`}
              </button>
              <p className="text-xs text-slate-400 text-center">Billed monthly · Cancel anytime</p>
            </div>
          </div>
        </div>
      ))}

      <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 text-sm text-slate-500">
        <p className="font-semibold text-slate-700 mb-1">💳 Secure payments by Stripe</p>
        <p>All payments processed securely. Test mode active — use card <code className="bg-slate-100 px-1 rounded">4242 4242 4242 4242</code> with any future expiry.</p>
      </div>
    </div>
  );
}
