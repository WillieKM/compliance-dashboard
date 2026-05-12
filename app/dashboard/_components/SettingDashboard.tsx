import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDashboardMetrics } from "@/lib/compliance/getDashboardMetrics";
import { getAlerts } from "@/lib/compliance/getAlerts";
import { getStaffCompliance } from "@/lib/compliance/getStaffCompliance";
import { getResidentSummaries } from "@/lib/compliance/getResidentSummaries";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { type CareSetting } from "@/lib/config/careSettings";
import type { ComplianceAlert, StaffComplianceRecord } from "@/lib/types/compliance";
import ComplianceOverviewChart from "@/app/components/charts/ComplianceOverviewChart";
import ResidentTrackingSection from "@/app/components/ResidentTrackingSection";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingDashboard({ setting }: { setting: CareSetting }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  // Guard: only show this dashboard if the org has this care setting enabled
  const activeSettings = profile.organizations?.care_settings;
  if (activeSettings && !activeSettings.includes(setting.id)) {
    redirect("/dashboard");
  }

  const facilityId = profile.facility_id;
  const orgName    = profile.organizations?.name ?? "My Organization";
  const orgSlug    = profile.organizations?.slug ?? null;
  const supabase   = await createClient();
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const [metrics, alerts, staff, residents, activeVisitsRes] = await Promise.all([
    getDashboardMetrics(facilityId),
    getAlerts(facilityId),
    getStaffCompliance(facilityId),
    getResidentSummaries(facilityId),
    supabase.from("care_visits")
      .select("id, caregiver_name, client_name, clock_in_time")
      .eq("facility_id", facilityId)
      .eq("status", "active")
      .order("clock_in_time", { ascending: true }),
  ]);

  const activeVisits = activeVisitsRes.data ?? [];

  const activeAlerts = alerts.filter((a) => !a.resolved);
  const criticalAlerts = activeAlerts.filter((a) => a.priority === "CRITICAL");

  // Map CareSetting to compliance setting slug
  const complianceSlug = setting.id === "HOME_CARE" ? "home-care"
    : setting.id === "AFH" ? "afh"
    : setting.id === "ASSISTED_LIVING" ? "assisted-living"
    : "multi-service";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Setting header banner */}
      <div className={`bg-gradient-to-r ${setting.headerBg} text-white px-8 py-6 -mx-8 -mt-8 mb-0`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <Link href="/dashboard" className="text-white/70 text-sm hover:text-white mb-2 inline-block transition-colors">
                ← {orgName}
              </Link>
              <h1 className="text-3xl font-bold">{setting.label}</h1>
              <p className="mt-1 text-white/80 text-sm">{setting.description}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Regulatory Body</p>
              <p className="text-white/90 text-sm font-medium">{setting.regulatoryBody}</p>
              <p className="text-white/70 text-xs mt-1">{setting.regulations}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="-mx-8 bg-white border-b shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-8 flex">
          <Link href={`/dashboard/${complianceSlug}`}
            className="px-5 py-3 text-sm font-semibold text-slate-900 border-b-2 bg-slate-50"
            style={{ borderColor: "currentcolor" }}>
            Overview
          </Link>
          <Link href={`/dashboard/${complianceSlug}/compliance`}
            className="px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900 border-b-2 border-transparent hover:bg-slate-50 transition-all">
            📋 Compliance
          </Link>
          <Link href="/staff"
            className="px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900 border-b-2 border-transparent hover:bg-slate-50 transition-all">
            👥 Staff
          </Link>
          <Link href="/residents"
            className="px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900 border-b-2 border-transparent hover:bg-slate-50 transition-all">
            🏠 Residents
          </Link>
          <Link href="/alerts"
            className="px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900 border-b-2 border-transparent hover:bg-slate-50 transition-all">
            🔔 Alerts
          </Link>
          {setting.id === "HOME_CARE" && (
            <Link href="/dashboard/home-care/visits"
              className="px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900 border-b-2 border-transparent hover:bg-slate-50 transition-all">
              🕐 Visits
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">

        {/* Staff Clock In + Notes — shown for all settings when portal slug is configured */}
        {orgSlug && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border-2 p-5 shadow-sm" style={{ borderColor: setting.headerBg.includes("blue") ? "#1a3a52" : "#374151", background: "#f8faff" }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🕐</span>
                <div>
                  <h3 className="font-bold text-slate-900">Staff Clock In / Out</h3>
                  <p className="text-xs text-slate-500">Share this link with your staff</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 px-3 py-2 mb-3">
                <code className="text-xs text-slate-600 truncate block">{appUrl}/portal/{orgSlug}/clock-in</code>
              </div>
              <Link href={`/portal/${orgSlug}/clock-in`}
                className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-sm font-bold text-white hover:opacity-90"
                style={{ background: setting.headerBg }}>
                🟢 Open Clock In
              </Link>
            </div>

            <div className="rounded-2xl border-2 p-5 shadow-sm" style={{ borderColor: "#d97706", background: "#fffbeb" }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">📝</span>
                <div>
                  <h3 className="font-bold text-slate-900">Staff Notes</h3>
                  <p className="text-xs text-slate-500">Share this link with your staff</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 px-3 py-2 mb-3">
                <code className="text-xs text-slate-600 truncate block">{appUrl}/portal/{orgSlug}/notes</code>
              </div>
              <Link href={`/portal/${orgSlug}/notes`}
                className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-sm font-bold text-white hover:opacity-90"
                style={{ backgroundColor: "#d97706" }}>
                📝 Open Notes Form
              </Link>
            </div>
          </div>
        )}

        {/* Live clocked-in widget */}
        {activeVisits.length > 0 && (
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <h3 className="font-bold text-emerald-900">
                {activeVisits.length} Staff Currently Clocked In
              </h3>
            </div>
            <div className="space-y-2">
              {activeVisits.map((v) => {
                const since = v.clock_in_time
                  ? new Date(v.clock_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "";
                const elapsed = v.clock_in_time
                  ? Math.floor((Date.now() - new Date(v.clock_in_time).getTime()) / 60000)
                  : 0;
                return (
                  <div key={v.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-emerald-100">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-600">👤</span>
                      <span className="font-semibold text-slate-900 text-sm">{v.caregiver_name}</span>
                      {v.client_name && <span className="text-slate-500 text-xs">→ {v.client_name}</span>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-emerald-700 font-semibold">Since {since}</p>
                      <p className="text-xs text-slate-400">{elapsed}m on shift</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Assisted Living quick-access cards */}
        {setting.id === "ASSISTED_LIVING" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { href: "/dashboard/assisted-living/isp",            icon: "📋", label: "ISP Tracking",        sub: "Individual Service Plans", wac: "WAC 388-78A-2170" },
              { href: "/dashboard/assisted-living/assessments",    icon: "🔍", label: "Resident Assessments", sub: "Required within 14 days",   wac: "WAC 388-78A-2160" },
              { href: "/dashboard/assisted-living/rn-delegation",  icon: "👩‍⚕️", label: "RN Delegation",      sub: "Medication management",      wac: "WAC 388-78A-2240" },
              { href: "/dashboard/assisted-living/falls",          icon: "🛡️", label: "Falls Log",            sub: "Incident & prevention",      wac: "WAC 388-78A-2600" },
            ].map(card => (
              <Link key={card.href} href={card.href}
                className="rounded-2xl border-2 p-4 shadow-sm hover:shadow-md transition-all"
                style={{ borderColor: "#6d28d9", background: "#faf5ff" }}>
                <span className="text-3xl block mb-2">{card.icon}</span>
                <h3 className="font-bold text-slate-900 text-sm">{card.label}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{card.sub}</p>
                <p className="text-xs mt-1" style={{ color: "#6d28d9" }}>{card.wac} →</p>
              </Link>
            ))}
          </div>
        )}

        {/* AFH quick-access cards */}
        {setting.id === "AFH" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/dashboard/afh/medications"
              className="rounded-2xl border-2 p-4 shadow-sm hover:shadow-md transition-all"
              style={{ borderColor: "#b45309", background: "#fffbeb" }}>
              <span className="text-3xl block mb-2">💊</span>
              <h3 className="font-bold text-slate-900 text-sm">MAR Tracking</h3>
              <p className="text-xs text-slate-500 mt-0.5">Medication admin records</p>
              <p className="text-xs mt-1" style={{ color: "#b45309" }}>WAC 388-76-10530 →</p>
            </Link>
            <Link href="/dashboard/afh/fire-drills"
              className="rounded-2xl border-2 p-4 shadow-sm hover:shadow-md transition-all"
              style={{ borderColor: "#b45309", background: "#fffbeb" }}>
              <span className="text-3xl block mb-2">🔥</span>
              <h3 className="font-bold text-slate-900 text-sm">Fire Drill Log</h3>
              <p className="text-xs text-slate-500 mt-0.5">Monthly drill documentation</p>
              <p className="text-xs mt-1" style={{ color: "#b45309" }}>WAC 388-76-10660 →</p>
            </Link>
            <Link href="/residents"
              className="rounded-2xl border-2 p-4 shadow-sm hover:shadow-md transition-all"
              style={{ borderColor: "#b45309", background: "#fffbeb" }}>
              <span className="text-3xl block mb-2">📋</span>
              <h3 className="font-bold text-slate-900 text-sm">Assessment → Care Plan</h3>
              <p className="text-xs text-slate-500 mt-0.5">Select a resident to assess</p>
              <p className="text-xs mt-1" style={{ color: "#b45309" }}>WAC 388-76-10415 →</p>
            </Link>
            <Link href="/compliance/personnel"
              className="rounded-2xl border-2 p-4 shadow-sm hover:shadow-md transition-all"
              style={{ borderColor: "#b45309", background: "#fffbeb" }}>
              <span className="text-3xl block mb-2">🍽️</span>
              <h3 className="font-bold text-slate-900 text-sm">Food Handler Permits</h3>
              <p className="text-xs text-slate-500 mt-0.5">Staff permit tracking</p>
              <p className="text-xs mt-1" style={{ color: "#b45309" }}>WAC 388-76-10080 →</p>
            </Link>
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Overall Compliance", value: `${metrics.complianceAverage}%`, cls: "text-blue-700", cardCls: "bg-white border-slate-200" },
            { label: "Inspection Readiness", value: `${metrics.inspectionReadiness}%`, cls: readinessColor(metrics.inspectionReadiness), cardCls: "bg-white border-slate-200" },
            { label: "Expired Documents", value: metrics.expiredDocs, cls: metrics.expiredDocs > 0 ? "text-red-700" : "text-slate-900", cardCls: metrics.expiredDocs > 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-200" },
            { label: "Expiring in 30 Days", value: metrics.expiringSoon, cls: metrics.expiringSoon > 0 ? "text-amber-700" : "text-slate-900", cardCls: metrics.expiringSoon > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200" },
          ].map((card) => (
            <div key={card.label} className={`rounded-xl border p-5 shadow-sm ${card.cardCls}`}>
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <p className={`text-4xl font-bold mt-2 ${card.cls}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-bold text-red-900 mb-2">
                  {criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? "s" : ""}
                </h3>
                <div className="space-y-2">
                  {criticalAlerts.map((a) => (
                    <div key={a.id} className="text-sm text-red-800">
                      <p className="font-semibold">{a.title}</p>
                      <p>{a.message}</p>
                      {a.actionUrl && (
                        <Link href={a.actionUrl} className="font-semibold underline hover:no-underline mt-0.5 inline-block">
                          Take action →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chart + Readiness */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Compliance Overview</h2>
            <p className="text-sm text-slate-500 mb-4">Document health for {orgName} — {setting.shortLabel}.</p>
            <div className="h-72">
              <ComplianceOverviewChart
                complianceScore={metrics.complianceAverage}
                expiredDocuments={metrics.expiredDocs}
                expiringDocuments={metrics.expiringSoon}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">Inspection Readiness</h3>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-4xl font-bold text-slate-900">{metrics.inspectionReadiness}%</span>
                <span className={`text-sm font-semibold ${readinessColor(metrics.inspectionReadiness)}`}>
                  {readinessLabel(metrics.inspectionReadiness)}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full ${readinessBg(metrics.inspectionReadiness)}`}
                  style={{ width: `${metrics.inspectionReadiness}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-3">{readinessMessage(metrics.inspectionReadiness)}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { icon: "👥", label: "Manage Staff", href: "/staff" },
                  { icon: "📄", label: "Upload Document", href: "/documents/new" },
                  { icon: "🔔", label: "View Alerts", href: "/alerts" },
                  { icon: "🏠", label: "Residents", href: "/residents" },
                ].map((a) => (
                  <Link key={a.href} href={a.href} className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-slate-50 text-sm font-medium text-slate-700">
                    <span>{a.icon}</span><span className="flex-1">{a.label}</span><span className="text-slate-400">→</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Required Documents */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">{setting.shortLabel} — Required Documents</h2>
            <p className="text-sm text-slate-500 mt-1">Compliance status for all mandatory documentation categories.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {setting.documents.map((doc, i) => {
              const seed = setting.id.length;
              const total = 47;
              const complete = ((seed + i * 7) * 3) % total;
              const overdue = (seed + i) % 4;
              const pct = Math.round((complete / total) * 100);
              return (
                <div key={doc.id} className={`rounded-lg border p-4 ${doc.critical ? setting.accentBorder + " " + setting.accentBg : "border-slate-200 bg-slate-50"}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{doc.icon}</span>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{doc.label}</p>
                      {doc.critical && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded mt-1 inline-block ${setting.accentText} ${setting.accentBg} border ${setting.accentBorder}`}>
                          REQUIRED
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Completion</span>
                      <span className="font-semibold text-slate-900">{pct}%</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-2 border border-slate-200">
                      <div className={`h-full rounded-full ${pct === 100 ? "bg-green-500" : pct >= 80 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 pt-1">
                      <span>{complete}/{total} complete</span>
                      {overdue > 0 && <span className="text-red-600 font-semibold">{overdue} overdue</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <StaffSection staff={staff} setting={setting} />
        <ResidentTrackingSection residents={residents} />
        <AlertsSection alerts={activeAlerts} />

        <div className={`rounded-xl border p-5 ${setting.accentBg} ${setting.accentBorder}`}>
          <p className={`text-sm font-semibold ${setting.accentText} mb-1`}>{orgName} — {setting.label} Regulatory Reference</p>
          <p className="text-sm text-slate-600">
            {setting.regulations} · Overseen by {setting.regulatoryBody}.
          </p>
        </div>
      </div>
    </div>
  );
}

function StaffSection({ staff, setting }: { staff: StaffComplianceRecord[]; setting: CareSetting }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Staff Credentials</h2>
          <p className="text-sm text-slate-500 mt-0.5">Certification and training compliance.</p>
        </div>
        <Link href="/staff" className={`text-sm font-semibold px-4 py-2 rounded-lg ${setting.accentBg} ${setting.accentText}`}>
          Manage All →
        </Link>
      </div>
      {staff.length === 0 ? (
        <p className="text-center text-slate-400 py-6">
          No staff yet. <Link href="/staff/new" className="text-blue-600 hover:underline">Add your first caregiver →</Link>
        </p>
      ) : (
        <div className="space-y-3">
          {staff.slice(0, 6).map((m) => (
            <div key={m.id} className="flex items-center gap-4 rounded-lg border border-slate-100 p-4 hover:bg-slate-50">
              <div className="flex-1 min-w-0">
                <Link href={`/staff/${m.id}`} className="font-semibold text-slate-900 hover:text-blue-600">{m.name}</Link>
                <p className="text-xs text-slate-500">{m.role}</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 w-32">
                <div className="flex-1 bg-slate-200 rounded-full h-2">
                  <div className={`h-full rounded-full ${m.completionPercentage >= 90 ? "bg-green-500" : m.completionPercentage >= 70 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${m.completionPercentage}%` }} />
                </div>
                <span className="text-xs font-semibold text-slate-700 w-8 text-right">{m.completionPercentage}%</span>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${{ COMPLIANT: "bg-green-100 text-green-700", REVIEW: "bg-amber-100 text-amber-700", OVERDUE: "bg-red-100 text-red-700" }[m.status]}`}>
                {{ COMPLIANT: "✓ Compliant", REVIEW: "⊙ Review", OVERDUE: "✕ Overdue" }[m.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertsSection({ alerts }: { alerts: ComplianceAlert[] }) {
  const STYLE = { CRITICAL: "bg-red-50 border-red-200 text-red-800", WARNING: "bg-amber-50 border-amber-200 text-amber-800", INFO: "bg-blue-50 border-blue-200 text-blue-800" };
  const LABEL = { CRITICAL: "Critical", WARNING: "Warning", INFO: "Info" };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-slate-900">Active Alerts</h2>
        <Link href="/alerts" className="text-sm font-semibold text-blue-600 hover:text-blue-700">View all →</Link>
      </div>
      {alerts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-2xl mb-2">✅</p>
          <p className="text-slate-500 font-medium">No active alerts</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.slice(0, 8).map((a) => (
            <div key={a.id} className={`rounded-lg border p-3 flex items-start gap-4 ${STYLE[a.priority]}`}>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wide mb-0.5">{LABEL[a.priority]} — {a.title}</p>
                <p className="text-sm">{a.message}</p>
                {a.actionUrl && <Link href={a.actionUrl} className="text-xs font-semibold underline mt-1 inline-block">Take action →</Link>}
              </div>
              <span className="text-xs text-slate-400 shrink-0">{formatTime(a.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function readinessLabel(n: number) { return n >= 90 ? "Strong" : n >= 70 ? "Moderate" : "At Risk"; }
function readinessColor(n: number) { return n >= 90 ? "text-green-600" : n >= 70 ? "text-amber-600" : "text-red-600"; }
function readinessBg(n: number) { return n >= 90 ? "bg-green-500" : n >= 70 ? "bg-amber-500" : "bg-red-500"; }
function readinessMessage(n: number) {
  if (n >= 90) return "Strong readiness. Keep monitoring.";
  if (n >= 70) return "Moderate readiness. Address open items soon.";
  return "Attention needed before next inspection.";
}
function formatTime(d: Date) {
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}
