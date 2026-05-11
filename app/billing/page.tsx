"use client";

import { useState } from "react";
import { ALL_CARE_PLANS } from "@/lib/stripe";

export default function BillingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  async function subscribe(priceId: string, label: string) {
    setLoading(priceId);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
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
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Billing & Plans</h1>
        <p className="text-slate-500 mt-2">
          Subscribe to the care setting your agency operates. Each setting is priced separately.
          Cancel or upgrade anytime.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {ALL_CARE_PLANS.map((plan) => (
        <div key={plan.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Plan header */}
          <div className="px-6 py-4 flex items-center gap-3" style={{ backgroundColor: plan.color }}>
            <span className="text-2xl">{plan.icon}</span>
            <div>
              <h2 className="text-xl font-bold text-white">{plan.label}</h2>
              <p className="text-xs text-white/70">{plan.wac}</p>
            </div>
          </div>

          {/* Starter + Pro side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* Starter */}
            <div className="p-6 flex flex-col">
              <div className="mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Starter</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-4xl font-bold text-slate-900">${plan.starter.price}</span>
                  <span className="text-slate-500 text-sm">/month</span>
                </div>
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {plan.starter.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-emerald-500 font-bold mt-0.5">✓</span>{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => subscribe(plan.starter.priceId, `${plan.label} Starter`)}
                disabled={loading !== null}
                className="w-full rounded-xl py-2.5 font-bold text-sm border-2 transition-all disabled:opacity-60 hover:opacity-90"
                style={{ borderColor: plan.color, color: plan.color }}
              >
                {loading === plan.starter.priceId ? "Redirecting…" : "Subscribe — $49/mo"}
              </button>
            </div>

            {/* Pro */}
            <div className="p-6 flex flex-col relative">
              <div className="absolute top-4 right-4">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: plan.color }}>
                  MOST POPULAR
                </span>
              </div>
              <div className="mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Professional</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-4xl font-bold text-slate-900">${plan.pro.price}</span>
                  <span className="text-slate-500 text-sm">/month</span>
                </div>
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {plan.pro.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-emerald-500 font-bold mt-0.5">✓</span>{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => subscribe(plan.pro.priceId, `${plan.label} Pro`)}
                disabled={loading !== null}
                className="w-full rounded-xl py-2.5 font-bold text-sm text-white transition-all disabled:opacity-60 hover:opacity-90"
                style={{ backgroundColor: plan.color }}
              >
                {loading === plan.pro.priceId ? "Redirecting…" : "Subscribe — $89/mo"}
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Stripe setup note */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 text-sm text-slate-500">
        <p className="font-semibold text-slate-700 mb-1">💳 Secure payments by Stripe</p>
        <p>All payments are processed securely. You can cancel anytime from your Stripe customer portal.
        Test mode is active — use card <code className="bg-slate-100 px-1 rounded">4242 4242 4242 4242</code> to test.</p>
      </div>
    </div>
  );
}
