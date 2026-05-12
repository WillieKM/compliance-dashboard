import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { redirect } from "next/navigation";

const ALL_SETTINGS_NAV = [
  { id: "HOME_CARE",       href: "/compliance/home-care",       label: "🏥 Home Care",       reg: "WAC 246-335" },
  { id: "AFH",             href: "/compliance/afh",             label: "🏠 AFH",             reg: "WAC 388-76" },
  { id: "ASSISTED_LIVING", href: "/compliance/assisted-living", label: "🏢 Assisted Living", reg: "WAC 388-78A" },
  { id: "MULTI_SERVICE",   href: "/compliance/multi-service",   label: "🌐 Multi-Service",   reg: "Multiple" },
];

const SHARED_NAV = [
  { href: "/compliance",                   label: "Hub",        icon: "📊" },
  { href: "/compliance/personnel",         label: "Personnel",  icon: "👥" },
  { href: "/compliance/background-checks", label: "BG Checks",  icon: "🔍" },
  { href: "/compliance/tb-assessments",    label: "TB",         icon: "🫁" },
  { href: "/compliance/training",          label: "Training",   icon: "📚" },
  { href: "/compliance/clients",           label: "Clients",    icon: "🏠" },
  { href: "/compliance/complaints",        label: "Complaints", icon: "📋" },
  { href: "/compliance/reports",           label: "Reports",    icon: "📄" },
];

export default async function ComplianceLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  // Only show care settings the org has enabled
  const activeSettings = profile.organizations?.care_settings ?? ALL_SETTINGS_NAV.map(s => s.id);
  const settingsNav = ALL_SETTINGS_NAV.filter(s => activeSettings.includes(s.id));

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9fafb" }}>
      {/* Module header */}
      <div className="text-white px-6 py-3 flex items-center justify-between" style={{ backgroundColor: "#1a3a52" }}>
        <div>
          <Link href="/compliance" className="text-lg font-bold hover:opacity-90">
            WA Care Compliance
          </Link>
          <p className="text-xs mt-0.5" style={{ color: "#d4a574" }}>
            {profile.organizations?.name}
          </p>
        </div>
        <Link href="/dashboard" className="text-sm opacity-70 hover:opacity-100">← Dashboard</Link>
      </div>

      {/* Care setting tabs — filtered to org's settings */}
      <div className="bg-white border-b shadow-sm overflow-x-auto">
        <div className="flex min-w-max px-4 gap-1 pt-2">
          {settingsNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center px-5 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 whitespace-nowrap border-b-2 border-transparent hover:border-[#1a3a52] rounded-t-lg transition-all"
            >
              <span>{item.label}</span>
              <span className="text-xs font-normal text-slate-400 mt-0.5">{item.reg}</span>
            </Link>
          ))}
          <div className="flex-1" />
          {SHARED_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 whitespace-nowrap rounded-t-lg transition-all"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">{children}</div>
    </div>
  );
}
