import Link from "next/link";
import { redirect } from "next/navigation";
import { getDashboardMetrics } from "@/lib/compliance/getDashboardMetrics";
import { getAlerts } from "@/lib/compliance/getAlerts";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { ALL_CARE_SETTINGS } from "@/lib/config/careSettings";

export const dynamic = "force-dynamic";

const COLOR_MAP: Record<string, { card: string; badge: string; btn: string }> = {
  blue:   { card: "border-blue-200 bg-blue-50 hover:bg-blue-100",     badge: "bg-blue-600",   btn: "bg-blue-600 hover:bg-blue-700" },
  amber:  { card: "border-amber-200 bg-amber-50 hover:bg-amber-100",  badge: "bg-amber-500",  btn: "bg-amber-500 hover:bg-amber-600" },
  purple: { card: "border-purple-200 bg-purple-50 hover:bg-purple-100", badge: "bg-purple-600", btn: "bg-purple-600 hover:bg-purple-700" },
  green:  { card: "border-teal-200 bg-teal-50 hover:bg-teal-100",     badge: "bg-teal-600",   btn: "bg-teal-600 hover:bg-teal-700" },
};

export default async function DashboardHubPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const facilityId = profile.facility_id;
  const orgName = profile.organizations?.name ?? "My Organization";
  const activeSettings = profile.organizations?.care_settings ?? ALL_CARE_SETTINGS.map((s) => s.id);
  const visibleSettings = ALL_CARE_SETTINGS.filter((s) => activeSettings.includes(s.id));

  const [metrics, alerts] = await Promise.all([
    getDashboardMetrics(facilityId),
    getAlerts(facilityId),
  ]);

  const activeAlerts = alerts.filter((a) => !a.resolved);
  const critical = activeAlerts.filter((a) => a.priority === "CRITICAL").length;

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">
          CareCompliance
        </p>
        <h1 className="text-4xl font-bold text-slate-900">{orgName}</h1>
        <p className="mt-2 text-slate-500">Select a care setting to view its compliance dashboard.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Overall Compliance", value: `${metrics.complianceAverage}%`, cls: "text-blue-700" },
          { label: "Inspection Readiness", value: `${metrics.inspectionReadiness}%`, cls: metrics.inspectionReadiness >= 90 ? "text-green-600" : metrics.inspectionReadiness >= 70 ? "text-amber-600" : "text-red-600" },
          { label: "Expired Documents", value: metrics.expiredDocs, cls: metrics.expiredDocs > 0 ? "text-red-700" : "text-slate-900" },
          { label: "Active Alerts", value: activeAlerts.length, cls: activeAlerts.length > 0 ? "text-amber-600" : "text-slate-900" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {critical > 0 && (
        <div className="rounded-xl bg-red-50 border-2 border-red-200 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <p className="font-semibold text-red-900">
              {critical} critical alert{critical > 1 ? "s" : ""} require immediate action.
            </p>
          </div>
          <Link href="/alerts" className="shrink-0 text-sm font-semibold text-red-700 hover:underline">
            View alerts →
          </Link>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Your Dashboards</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {visibleSettings.map((s) => {
            const colors = COLOR_MAP[s.color] ?? COLOR_MAP.blue;
            return (
              <Link
                key={s.id}
                href={`/dashboard/${s.slug}`}
                className={`group rounded-2xl border-2 p-6 transition-all shadow-sm ${colors.card}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{s.label}</h3>
                    <p className="text-sm text-slate-500 mt-1">{s.description}</p>
                  </div>
                  <span className={`${colors.badge} text-white text-xs font-bold px-2.5 py-1 rounded-full`}>
                    {s.documents.length} doc types
                  </span>
                </div>
                <div className="space-y-1.5 mb-5">
                  {s.documents.filter((d) => d.critical).slice(0, 3).map((d) => (
                    <div key={d.id} className="flex items-center gap-2 text-sm text-slate-600">
                      <span>{d.icon}</span><span>{d.label}</span>
                    </div>
                  ))}
                </div>
                <div className={`${colors.btn} text-white text-sm font-bold px-4 py-2.5 rounded-lg inline-flex items-center gap-2`}>
                  Open Dashboard →
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: "👥", label: "Staff", href: "/staff" },
          { icon: "🏠", label: "Residents", href: "/residents" },
          { icon: "📄", label: "Documents", href: "/documents" },
          { icon: "🔔", label: "Alerts", href: "/alerts" },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 hover:shadow-md transition-shadow text-slate-700 font-medium">
            <span className="text-xl">{l.icon}</span><span>{l.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
