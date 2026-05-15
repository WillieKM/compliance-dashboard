"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const PRESET_COLORS = [
  { label: "Navy",       value: "#1a3a52" },
  { label: "Royal Blue", value: "#1d4ed8" },
  { label: "Emerald",    value: "#059669" },
  { label: "Purple",     value: "#7c3aed" },
  { label: "Rose",       value: "#e11d48" },
  { label: "Amber",      value: "#d97706" },
  { label: "Slate",      value: "#475569" },
  { label: "Teal",       value: "#0d9488" },
];

export default function BrandingPage() {
  const [orgName, setOrgName]           = useState("");
  const [slug, setSlug]                 = useState("");
  const [tagline, setTagline]           = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1a3a52");
  const [logoUrl, setLogoUrl]           = useState<string | null>(null);
  const [orgId, setOrgId]               = useState<string | null>(null);
  const [facilityId, setFacilityId]     = useState<string | null>(null);
  const [careSetting, setCareSetting]   = useState("HOME_CARE");
  const [customDomain, setCustomDomain]     = useState("");
  const [domainStatus, setDomainStatus]     = useState<"idle"|"adding"|"added"|"verified"|"error">("idle");
  const [domainMessage, setDomainMessage]   = useState("");
  const [saving, setSaving]                 = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [saved, setSaved]               = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      // Use API route (service role) to bypass RLS
      const res = await fetch("/api/org/me").catch(() => null);
      if (!res?.ok) return;
      const { org, facilityId: fid, organizationId } = await res.json();
      if (org) {
        setOrgId(organizationId);
        setOrgName(org.name ?? "");
        setSlug(org.slug ?? "");
        setTagline(org.tagline ?? "");
        setPrimaryColor(org.primary_color ?? "#1a3a52");
        setLogoUrl(org.logo_url ?? null);
        setCustomDomain(org.custom_domain ?? "");
        const settings: string[] = org.care_settings ?? [];
        setCareSetting(settings[0] ?? "HOME_CARE");
      }
      setFacilityId(fid ?? null);
    }
    load();
  }, []);

  async function uploadLogo(file: File) {
    setUploading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/org/logo", { method: "POST", body: fd });
    const data = await res.json();

    if (data.error) {
      setError(`Logo upload failed: ${data.error}`);
    } else {
      setLogoUrl(data.url);
    }
    setUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/org/branding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: orgName,
        slug,
        tagline,
        primaryColor,
        logoUrl,
        careSetting,
        customDomain: customDomain.trim().toLowerCase() || null,
      }),
    });

    const result = await res.json();
    const saveErr = result.error ? { message: result.error } : null;

    if (saveErr) {
      setError(saveErr.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const portalUrl = `${appUrl}/portal/${slug || "your-slug"}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Brand Settings</h1>
        <p className="text-slate-500 text-sm mt-1">
          Customize your dashboard — logo, colors, and dedicated portal link.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Live preview */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <div className="text-white px-5 py-4 flex items-center gap-3"
          style={{ backgroundColor: primaryColor }}>
          {logoUrl
            ? <img src={logoUrl} alt="Logo" className="h-8 w-8 rounded object-contain bg-white/10 p-0.5" />
            : <div className="h-8 w-8 rounded bg-white/20 flex items-center justify-center text-xs font-bold">
                {orgName.slice(0, 2).toUpperCase()}
              </div>
          }
          <div>
            <p className="font-bold text-sm">{orgName || "Your Company"}</p>
            {tagline && <p className="text-xs opacity-70">{tagline}</p>}
          </div>
        </div>
        <div className="px-5 py-3 bg-white text-xs text-slate-500">
          Preview of your branded sidebar header
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Identity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 border-b border-slate-100 pb-3">Company Identity</h2>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Name</label>
            <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)}
              placeholder="Benmarr Home Care" className={inp} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Portal Slug — your dedicated URL
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 shrink-0">{appUrl}/portal/</span>
              <input type="text" value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                placeholder="benmarr" className={inp} />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Your clients and staff will use:{" "}
              <span className="font-mono text-blue-600">{portalUrl}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Care Setting</label>
            <select value={careSetting} onChange={(e) => setCareSetting(e.target.value)} className={inp}>
              <option value="HOME_CARE">🏥 Home Care Agency</option>
              <option value="AFH">🏠 Adult Family Home</option>
              <option value="ASSISTED_LIVING">🏢 Assisted Living Facility</option>
              <option value="MULTI_SERVICE">🌐 Multi-Service Agency</option>
            </select>
            <p className="text-xs text-slate-400 mt-1">This controls which compliance dashboard appears in your account.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tagline (optional)</label>
            <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)}
              placeholder="Staffing Need Fulfillment" className={inp} />
          </div>
        </div>

        {/* Logo */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 border-b border-slate-100 pb-3">Logo</h2>

          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-16 w-16 rounded-xl object-contain border border-slate-200 bg-slate-50 p-2" />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs text-center">
                No logo
              </div>
            )}
            <div className="flex-1">
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) uploadLogo(e.target.files[0]); }} />
              <button type="button" onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                {uploading ? "Uploading…" : "Upload Logo"}
              </button>
              {logoUrl && (
                <button type="button" onClick={() => setLogoUrl(null)}
                  className="ml-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50">
                  Remove
                </button>
              )}
              <p className="text-xs text-slate-400 mt-1.5">PNG, JPG, SVG — recommended 200×200px</p>
            </div>
          </div>
        </div>

        {/* Brand color */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 border-b border-slate-100 pb-3">Brand Color</h2>

          <div className="grid grid-cols-4 gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setPrimaryColor(c.value)}
                className={`rounded-xl p-3 flex flex-col items-center gap-1.5 border-2 transition-all ${primaryColor === c.value ? "border-slate-900 scale-105" : "border-transparent hover:border-slate-300"}`}
              >
                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: c.value }} />
                <span className="text-xs text-slate-600">{c.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <label className="text-sm font-semibold text-slate-700">Custom color:</label>
            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer" />
            <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#1a3a52" className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono" />
          </div>
        </div>

        {/* Custom Domain */}
        <div className="rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="font-bold text-slate-900">Custom Domain</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Let clients use their own domain — <strong>compliance.theirdomain.com</strong> loads their branded portal automatically.
              </p>
            </div>
            {domainStatus === "verified" && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold shrink-0">✓ Live</span>
            )}
            {domainStatus === "added" && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold shrink-0">⏳ Pending DNS</span>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={customDomain}
                onChange={(e) => { setCustomDomain(e.target.value.toLowerCase().trim()); setDomainStatus("idle"); }}
                placeholder="compliance.benmarrhomecare.com"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                disabled={!customDomain || domainStatus === "adding"}
                onClick={async () => {
                  setDomainStatus("adding");
                  setDomainMessage("");
                  try {
                    const res = await fetch("/api/org/domain", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ domain: customDomain }),
                    });
                    const data = await res.json();
                    setDomainMessage(data.message || "");
                    setDomainStatus(data.verified ? "verified" : data.success ? "added" : "error");
                  } catch {
                    setDomainStatus("error");
                    setDomainMessage("Something went wrong. Try again.");
                  }
                }}
                className="px-4 py-2.5 rounded-lg text-white text-sm font-bold disabled:opacity-50 hover:opacity-90 whitespace-nowrap"
                style={{ backgroundColor: "#1a3a52" }}
              >
                {domainStatus === "adding" ? "Adding…" : "Add Domain"}
              </button>
            </div>

            {domainMessage && (
              <p className={`text-xs px-3 py-2 rounded-lg ${domainStatus === "error" ? "bg-red-50 text-red-700" : domainStatus === "verified" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {domainMessage}
              </p>
            )}

            {customDomain && domainStatus !== "idle" && domainStatus !== "error" && (
              <div className="rounded-xl bg-slate-900 p-4">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">
                  DNS Record — Add at your registrar
                </p>
                <div className="bg-slate-800 rounded-lg p-3 font-mono text-xs">
                  <div className="grid grid-cols-3 gap-3 text-slate-500 mb-2 text-[10px] uppercase">
                    <span>Type</span><span>Name / Host</span><span>Value / Points to</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-emerald-400">
                    <span>CNAME</span>
                    <span>{customDomain.includes(".") ? customDomain.split(".").slice(0, -2).join(".") || "@" : customDomain}</span>
                    <span className="truncate">{appUrl.replace("https://", "").replace("http://", "")}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-slate-400 text-xs">⏱ DNS takes 5–30 min to propagate.</p>
                  {domainStatus === "added" && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await fetch(`/api/org/domain?domain=${customDomain}`);
                        const data = await res.json();
                        if (data.verified) { setDomainStatus("verified"); setDomainMessage("✓ Domain is live!"); }
                        else setDomainMessage("Not verified yet — DNS may still be propagating.");
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 underline"
                    >
                      Check status
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Your dedicated portal links */}
        <div className="rounded-2xl border-2 p-5" style={{ borderColor: primaryColor + "40", backgroundColor: primaryColor + "08" }}>
          <h2 className="font-bold text-slate-900 mb-2">Your Dedicated Portal Links</h2>
          <p className="text-xs text-slate-500 mb-3">Click to open · Click the copy icon to share</p>
          <div className="space-y-2">
            {[
              { label: "🔐 Branded Login",     path: "",          icon: "🔐" },
              { label: "🕐 Staff Clock In",    path: "/clock-in", icon: "🕐" },
              { label: "📝 Caregiver Notes",   path: "/notes",    icon: "📝" },
              { label: "📋 Staff Application", path: "/apply",    icon: "📋" },
            ].map(({ label, path }) => {
              const url = `${portalUrl}${path}`;
              return (
                <div key={label} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-slate-200">
                  <span className="text-xs font-semibold text-slate-600 w-36 shrink-0">{label}</span>
                  <a href={url} target="_blank" rel="noreferrer"
                    className="flex-1 text-xs text-blue-600 font-mono hover:underline truncate">
                    {url}
                  </a>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(url); }}
                    className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 shrink-0 transition-colors"
                    title="Copy link"
                  >
                    Copy
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full rounded-xl py-3 font-bold text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
          style={{ backgroundColor: primaryColor }}>
          {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Brand Settings"}
        </button>
      </form>
    </div>
  );
}

const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";
