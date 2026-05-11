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
  const [saving, setSaving]             = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [saved, setSaved]               = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id, facility_id, organizations(id, name, slug, primary_color, logo_url, tagline)")
        .maybeSingle();

      if (profile?.organizations) {
        const org = profile.organizations as unknown as Record<string, string>;
        setOrgId(org.id);
        setOrgName(org.name ?? "");
        setSlug(org.slug ?? "");
        setTagline(org.tagline ?? "");
        setPrimaryColor(org.primary_color ?? "#1a3a52");
        setLogoUrl(org.logo_url ?? null);
      }
      setFacilityId(profile?.facility_id ?? null);
    }
    load();
  }, []);

  async function uploadLogo(file: File) {
    if (!facilityId) return;
    setUploading(true);
    setError(null);

    const ext = file.name.split(".").pop();
    const path = `logos/${facilityId}/logo.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("logos")
      .upload(path, file, { upsert: true });

    if (upErr) {
      setError(`Logo upload failed: ${upErr.message}`);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("logos").getPublicUrl(path);
    setLogoUrl(data.publicUrl);
    setUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setSaving(true);
    setError(null);

    const { error: saveErr } = await supabase
      .from("organizations")
      .update({
        name: orgName,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        tagline,
        primary_color: primaryColor,
        logo_url: logoUrl,
      })
      .eq("id", orgId);

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

        {/* Your dedicated portal link */}
        <div className="rounded-2xl border-2 p-5" style={{ borderColor: primaryColor + "40", backgroundColor: primaryColor + "08" }}>
          <h2 className="font-bold text-slate-900 mb-2">Your Dedicated Portal Links</h2>
          <div className="space-y-2">
            {[
              { label: "Branded Login",     path: "" },
              { label: "Staff Clock In",    path: "/clock-in" },
              { label: "Caregiver Notes",   path: "/notes" },
              { label: "Staff Application", path: "/apply" },
            ].map(({ label, path }) => (
              <div key={label} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-200">
                <span className="text-xs font-semibold text-slate-600">{label}</span>
                <code className="text-xs text-blue-600 font-mono">{portalUrl}{path}</code>
              </div>
            ))}
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
