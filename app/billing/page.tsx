"use client";

import { useState } from "react";
import { PLANS } from "@/lib/stripe";

export default function BillingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function subscribe(planId: string) {
    setLoading(planId);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setLoading(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div>
        <h1 className="text-4xl font-bold text-slate-900">Billing & Subscription</h1>
        <p className="mt-2 text-slate-500">
          Choose the plan that fits your agency. Cancel or upgrade anytime.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          <strong>Error:</strong> {error}
          {error.includes("STRIPE_PRICE") && (
            <p className="mt-1 text-xs">
              Add <code className="bg-red-100 px-1 rounded">STRIPE_PRICE_STARTER</code>,{" "}
              <code className="bg-red-100 px-1 rounded">STRIPE_PRICE_PROFESSIONAL</code>, and{" "}
              <code className="bg-red-100 px-1 rounded">STRIPE_PRICE_AGENCY</code> to your{" "}
              <code className="bg-red-100 px-1 rounded">.env.local</code> file. See setup instructions below.
            </p>
          )}
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-2xl border-2 p-6 flex flex-col ${
              plan.highlight
                ? "border-blue-500 bg-blue-50 shadow-lg"
                : "border-slate-200 bg-white shadow-sm"
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              </div>
            )}

            <div className="mb-5">
              <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
              <p className="text-sm text-slate-500 mt-1">{plan.description}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-900">${plan.price}</span>
                <span className="text-slate-500 text-sm">/month</span>
              </div>
            </div>

            <ul className="space-y-2.5 flex-1 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="text-green-500 font-bold shrink-0 mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => subscribe(plan.id)}
              disabled={loading !== null}
              className={`w-full rounded-xl py-3 font-bold text-sm transition-all ${
                plan.highlight
                  ? "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  : "bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-60"
              }`}
            >
              {loading === plan.id ? "Redirecting…" : `Subscribe — $${plan.price}/mo`}
            </button>
          </div>
        ))}
      </div>

      {/* Stripe setup instructions */}
      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6">
        <h2 className="font-bold text-slate-900 mb-3">Stripe Setup (one-time)</h2>
        <ol className="space-y-3 text-sm text-slate-600 list-decimal list-inside">
          <li>
            Go to{" "}
            <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">
              dashboard.stripe.com
            </a>{" "}
            → create a free account.
          </li>
          <li>
            In <strong>Products</strong>, create 3 products: <em>Starter ($49)</em>,{" "}
            <em>Professional ($149)</em>, <em>Agency ($299)</em> — all set to{" "}
            <strong>Recurring / Monthly</strong>.
          </li>
          <li>
            Copy each product&apos;s <strong>Price ID</strong> (starts with <code className="bg-slate-100 px-1 rounded">price_</code>).
          </li>
          <li>
            Add to <code className="bg-slate-100 px-1 rounded">.env.local</code>:
            <pre className="mt-2 bg-slate-800 text-green-400 rounded-lg p-3 text-xs overflow-x-auto">
{`STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PROFESSIONAL=price_...
STRIPE_PRICE_AGENCY=price_...`}
            </pre>
          </li>
          <li>
            For webhooks: Stripe Dashboard → <strong>Webhooks</strong> → Add endpoint{" "}
            <code className="bg-slate-100 px-1 rounded">https://yourdomain.com/api/stripe/webhook</code> →
            listen for <code className="bg-slate-100 px-1 rounded">checkout.session.completed</code>,{" "}
            <code className="bg-slate-100 px-1 rounded">customer.subscription.updated</code>,{" "}
            <code className="bg-slate-100 px-1 rounded">customer.subscription.deleted</code>.
          </li>
          <li>Restart the dev server after updating <code className="bg-slate-100 px-1 rounded">.env.local</code>.</li>
        </ol>
        <p className="mt-4 text-xs text-slate-400">
          Use Stripe test mode keys (<code>sk_test_</code>) during development — no real charges.
        </p>
      </div>
    </div>
  );
}
