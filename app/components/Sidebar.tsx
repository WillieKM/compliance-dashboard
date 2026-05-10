import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";

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
];

export default async function Sidebar() {
  const profile = await getCurrentProfile();
  const orgName = profile?.organizations?.name ?? "CareCompliance";
  const activeSettings = profile?.organizations?.care_settings ?? ALL_DASHBOARDS.map((d) => d.id);
  const dashboards = ALL_DASHBOARDS.filter((d) => activeSettings.includes(d.id));

  return (
    <aside className="hidden min-h-screen w-64 border-r bg-white px-4 py-6 shadow-sm md:flex flex-col shrink-0">
      <div className="mb-6 px-2">
        <h1 className="text-lg font-bold text-blue-600 leading-tight">{orgName}</h1>
        <p className="mt-0.5 text-xs text-gray-400">Care Compliance Platform</p>
      </div>

      {/* Care setting dashboards — each with its own Compliance link */}
      <div className="mb-4">
        <p className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Dashboards
        </p>
        {dashboards.map((item) => (
          <div key={item.id}>
            <Link
              href={item.href}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <span>{item.label}</span>
            </Link>
            <Link
              href={item.complianceHref}
              className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-medium text-slate-500 hover:bg-amber-50 hover:text-amber-700 transition-colors ml-2"
            >
              <span>📋</span>
              <span>Compliance</span>
            </Link>
            {item.visitsHref && (
              <Link
                href={item.visitsHref}
                className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-medium text-slate-500 hover:bg-blue-50 hover:text-blue-700 transition-colors ml-2 mb-1"
              >
                <span>🕐</span>
                <span>Visits</span>
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Main nav */}
      <div className="border-t border-slate-100 pt-4">
        <p className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Manage
        </p>
        <nav className="space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Public */}
      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Public
        </p>
        <Link
          href="/apply"
          className="block rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
        >
          Staff Application Form ↗
        </Link>
      </div>

      <div className="mt-auto pt-4">
        <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white">
          <p className="text-sm font-bold">Inspection Ready?</p>
          <p className="mt-1 text-xs text-blue-100">Track credentials and compliance in real time.</p>
          <Link href="/billing" className="mt-3 block text-center bg-white text-blue-600 text-xs font-bold rounded-lg py-1.5 hover:bg-blue-50">
            View Plans →
          </Link>
        </div>
      </div>
    </aside>
  );
}
