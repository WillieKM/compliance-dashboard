import Link from "next/link";
import Image from "next/image";
import { getCurrentProfile, getOrgColor } from "@/lib/auth/getCurrentProfile";

const ALL_DASHBOARDS = [
  { id: "HOME_CARE",       label: "🏥 Home Care",        href: "/dashboard/home-care",       complianceHref: "/dashboard/home-care/compliance",       visitsHref: "/dashboard/home-care/visits" },
  { id: "AFH",             label: "🏠 Adult Family Home", href: "/dashboard/afh",             complianceHref: "/dashboard/afh/compliance",             visitsHref: null },
  { id: "ASSISTED_LIVING", label: "🏢 Assisted Living",   href: "/dashboard/assisted-living", complianceHref: "/dashboard/assisted-living/compliance", visitsHref: null },
  { id: "MULTI_SERVICE",   label: "🌐 Multi-Service",     href: "/dashboard/multi-service",   complianceHref: "/dashboard/multi-service/compliance",   visitsHref: null },
];

const navItems = [
  { label: "Overview",   href: "/dashboard" },
  { label: "Caregivers", href: "/staff" },
  { label: "Residents",  href: "/residents" },
  { label: "Documents",  href: "/documents" },
  { label: "Alerts",     href: "/alerts" },
  { label: "Checklist",  href: "/checklist" },
  { label: "Billing",    href: "/billing" },
  { label: "⚙ Branding", href: "/settings/branding" },
];

export default async function Sidebar() {
  const profile = await getCurrentProfile();
  const orgName    = profile?.organizations?.name      ?? "CareCompliance";
  const orgSlug    = profile?.organizations?.slug      ?? null;
  const logoUrl    = profile?.organizations?.logo_url  ?? null;
  const tagline    = profile?.organizations?.tagline   ?? "Care Compliance Platform";
  const brandColor = getOrgColor(profile);

  const activeSettings = profile?.organizations?.care_settings ?? ALL_DASHBOARDS.map((d) => d.id);
  const dashboards = ALL_DASHBOARDS.filter((d) => activeSettings.includes(d.id));

  return (
    <aside className="hidden min-h-screen w-64 border-r bg-white px-4 py-6 shadow-sm md:flex flex-col shrink-0">
      {/* Branded header */}
      <div className="rounded-xl px-3 py-3 mb-6 flex items-center gap-3" style={{ backgroundColor: brandColor }}>
        {logoUrl ? (
          <img src={logoUrl} alt={orgName} className="h-9 w-9 rounded-lg object-contain bg-white/10 p-0.5 shrink-0" />
        ) : (
          <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center text-sm font-bold text-white shrink-0">
            {orgName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white leading-tight truncate">{orgName}</h1>
          <p className="text-xs text-white/60 truncate">{tagline}</p>
        </div>
      </div>

      {/* Care setting dashboards */}
      <div className="mb-4">
        <p className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Dashboards</p>
        {dashboards.map((item) => (
          <div key={item.id}>
            <Link href={item.href} className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors">
              {item.label}
            </Link>
            <Link href={item.complianceHref} className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-medium text-slate-500 hover:bg-amber-50 hover:text-amber-700 transition-colors ml-2">
              <span>📋</span><span>Compliance</span>
            </Link>
            {item.visitsHref && (
              <Link href={item.visitsHref} className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-medium text-slate-500 hover:bg-blue-50 hover:text-blue-700 transition-colors ml-2 mb-1">
                <span>🕐</span><span>Visits</span>
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Main nav */}
      <div className="border-t border-slate-100 pt-4">
        <p className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Manage</p>
        <nav className="space-y-0.5">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-slate-50 hover:text-slate-900 transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Public */}
      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Public</p>
        <Link href="/apply" className="block rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors">
          Staff Application Form ↗
        </Link>
        {orgSlug && (
          <Link href={`/portal/${orgSlug}`} className="block rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors">
            Your Portal ↗
          </Link>
        )}
      </div>

      <div className="mt-auto pt-4">
        <div className="rounded-xl p-4 text-white" style={{ backgroundColor: brandColor }}>
          <p className="text-sm font-bold">Your Portal Link</p>
          {orgSlug ? (
            <p className="text-xs mt-1 opacity-70 break-all font-mono">
              {process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/portal/{orgSlug}
            </p>
          ) : (
            <p className="text-xs mt-1 opacity-70">Set up in Branding settings</p>
          )}
          <Link href="/settings/branding" className="mt-2 block text-center bg-white text-xs font-bold rounded-lg py-1.5 hover:opacity-90" style={{ color: brandColor }}>
            Customize Brand →
          </Link>
        </div>
      </div>
    </aside>
  );
}
