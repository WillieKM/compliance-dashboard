"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type OrgBrand = {
  id: string;
  name: string;
  slug: string;
  primary_color: string | null;
  logo_url: string | null;
  tagline: string | null;
};

export default function PortalLoginPage() {
  const { slug } = useParams<{ slug: string }>();
  const [org, setOrg] = useState<OrgBrand | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrg() {
      const { data } = await supabase
        .from("organizations")
        .select("id, name, slug, primary_color, logo_url, tagline")
        .eq("slug", slug)
        .maybeSingle();
      if (!data) setNotFound(true);
      else setOrg(data);
    }
    loadOrg();
  }, [slug]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    window.location.assign("/dashboard");
  }

  const color = org?.primary_color ?? "#1a3a52";

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <p className="text-5xl mb-4">🔍</p>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Portal not found</h1>
        <p className="text-slate-500">No agency found for <code className="bg-slate-100 px-2 py-0.5 rounded">/{slug}</code></p>
        <Link href="/login" className="mt-4 inline-block text-blue-600 hover:underline text-sm">← Back to main login</Link>
      </div>
    </div>
  );

  if (!org) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(135deg, ${color}15, white, ${color}08)` }}>
      {/* Branded header */}
      <div className="text-white px-8 py-6 flex items-center gap-4" style={{ backgroundColor: color }}>
        {org.logo_url ? (
          <img src={org.logo_url} alt={org.name} className="h-12 w-12 rounded-xl object-contain bg-white/10 p-1" />
        ) : (
          <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center text-xl font-bold">
            {org.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold">{org.name}</h1>
          {org.tagline && <p className="text-sm opacity-75">{org.tagline}</p>}
        </div>
      </div>

      {/* Login form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Sign in to your account</h2>
            <p className="text-sm text-slate-500 mb-6">{org.name} Compliance Portal</p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  placeholder="you@email.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": color } as React.CSSProperties} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                  placeholder="Your password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full rounded-xl py-3 font-bold text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
                style={{ backgroundColor: color }}>
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            {/* Quick links for caregivers */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Caregiver Quick Access</p>
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/portal/${slug}/clock-in`}
                  className="rounded-lg border-2 p-3 text-center text-sm font-semibold hover:opacity-80 transition-opacity"
                  style={{ borderColor: color, color }}>
                  🕐 Clock In / Out
                </Link>
                <Link href={`/portal/${slug}/notes`}
                  className="rounded-lg border-2 p-3 text-center text-sm font-semibold hover:opacity-80 transition-opacity"
                  style={{ borderColor: color, color }}>
                  📝 Submit Notes
                </Link>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-4">
            Powered by CareCompliance
          </p>
        </div>
      </div>
    </div>
  );
}
