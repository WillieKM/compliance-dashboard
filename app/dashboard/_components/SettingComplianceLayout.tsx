"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  settingSlug: string;
  settingLabel: string;
  settingReg: string;
  headerBg: string;
  children: React.ReactNode;
}

// path: relative to compliance base; externalHref: absolute URL for shared modules
const NAV_ITEMS = [
  { key: "overview",    label: "Overview",         icon: "📊", path: "",         externalHref: null, settingOnly: null },
  { key: "survey",      label: "Survey Checklist", icon: "✅", path: "/survey",   externalHref: null, settingOnly: null },
  { key: "personnel",   label: "Personnel",        icon: "👥", path: null,        externalHref: "/compliance/personnel", settingOnly: null },
  { key: "training",    label: "Training",         icon: "📚", path: null,        externalHref: "/compliance/training",  settingOnly: null },
  { key: "clients",     label: "Clients",          icon: "🏠", path: null,        externalHref: "/compliance/clients",   settingOnly: null },
  { key: "complaints",  label: "Complaints",       icon: "📋", path: null,        externalHref: "/compliance/complaints", settingOnly: null },
  { key: "reports",     label: "Reports",          icon: "📄", path: null,        externalHref: "/compliance/reports",   settingOnly: null },
  // AFH-only tabs
  { key: "medications", label: "MAR",              icon: "💊", path: null,        externalHref: "/dashboard/afh/medications", settingOnly: "afh" },
  { key: "fire-drills", label: "Fire Drills",      icon: "🔥", path: null,        externalHref: "/dashboard/afh/fire-drills", settingOnly: "afh" },
];

export default function SettingComplianceLayout({
  settingSlug, settingLabel, settingReg, headerBg, children,
}: Props) {
  const pathname = usePathname();
  const base = `/dashboard/${settingSlug}/compliance`;

  return (
    <div>
      {/* Compliance sub-header */}
      <div className="rounded-xl text-white px-5 py-3 mb-4 flex items-center justify-between flex-wrap gap-3"
        style={{ background: headerBg }}>
        <div>
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/${settingSlug}`} className="text-white/70 text-sm hover:text-white transition-colors">
              ← {settingLabel}
            </Link>
          </div>
          <h2 className="text-lg font-bold mt-0.5">Compliance Module</h2>
          <p className="text-xs opacity-60">{settingReg}</p>
        </div>
        <Link
          href="/compliance/personnel/new"
          className="text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
        >
          + Add Staff Record
        </Link>
      </div>

      {/* Compliance sub-nav */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-x-auto">
        <div className="flex min-w-max">
          {NAV_ITEMS.filter(item => !item.settingOnly || item.settingOnly === settingSlug).map((item) => {
            const href = item.externalHref ?? (item.path ? `${base}${item.path}` : base);
            const isActive = item.externalHref
              ? pathname.startsWith(item.externalHref)
              : item.path
              ? pathname.startsWith(`${base}${item.path}`)
              : pathname === base || pathname === base + "/";
            return (
              <Link
                key={item.key}
                href={href}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? "border-current text-slate-900 bg-slate-50"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
                style={isActive ? { borderColor: "currentcolor" } : {}}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.externalHref && <span className="text-xs opacity-40">↗</span>}
              </Link>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}
