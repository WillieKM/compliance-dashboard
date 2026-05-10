import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { daysUntil, WA_COLORS } from "@/lib/compliance/waComplianceUtils";
import type { ComplianceSetting } from "@/lib/compliance/careSettingCompliance";

export const dynamic = "force-dynamic";

export default async function SettingComplianceDashboard({ setting }: { setting: ComplianceSetting }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const fid = profile.facility_id;
  const today = new Date().toISOString().split("T")[0];

  const [personnelRes, complaintsRes, clientsRes, surveyRes] = await Promise.all([
    supabase.from("personnel_compliance").select("compliance_status, bg_check_renewal_due, tb_assessment_annual_due").eq("facility_id", fid),
    supabase.from("complaints").select("status, doh_notification_required, doh_reported_date").eq("facility_id", fid),
    supabase.from("client_documentation").select("documentation_status").eq("facility_id", fid),
    supabase.from("survey_readiness").select("is_complete, priority").eq("facility_id", fid).eq("care_setting", setting.slug),
  ]);

  const personnel  = personnelRes.data ?? [];
  const complaints = complaintsRes.data ?? [];
  const clients    = clientsRes.data ?? [];
  const survey     = surveyRes.data ?? [];

  const totalPersonnel  = personnel.length;
  const compliant       = personnel.filter((p) => p.compliance_status === "compliant").length;
  const complianceRate  = totalPersonnel > 0 ? Math.round((compliant / totalPersonnel) * 100) : 0;
  const bgOverdue       = personnel.filter((p) => p.bg_check_renewal_due && p.bg_check_renewal_due < today).length;
  const tbOverdue       = personnel.filter((p) => p.tb_assessment_annual_due && p.tb_assessment_annual_due < today).length;
  const bgDueSoon       = personnel.filter((p) => { const d = daysUntil(p.bg_check_renewal_due); return d !== null && d >= 0 && d <= 60; }).length;
  const openComplaints  = complaints.filter((c) => c.status === "open").length;
  const unreportedDoh   = complaints.filter((c) => c.doh_notification_required && !c.doh_reported_date).length;
  const clientGaps      = clients.filter((c) => c.documentation_status === "gaps" || c.documentation_status === "critical_gaps").length;

  const surveyTotal    = survey.length;
  const surveyComplete = survey.filter((s) => s.is_complete).length;
  const surveyPct      = surveyTotal > 0 ? Math.round((surveyComplete / surveyTotal) * 100) : 0;
  const criticalLeft   = survey.filter((s) => !s.is_complete && s.priority === "critical").length;

  const overallScore = Math.round((complianceRate + surveyPct) / 2);

  const hasCritical = bgOverdue > 0 || tbOverdue > 0 || criticalLeft > 0 || unreportedDoh > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/compliance" className="text-sm hover:underline" style={{ color: WA_COLORS.navy }}>
          ← Compliance Hub
        </Link>
        <h1 className="text-2xl font-bold mt-2" style={{ color: WA_COLORS.navy }}>
          {setting.label} Compliance
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {setting.primaryRegulation} · {setting.regulatoryBody}
        </p>
      </div>

      {/* Score banner */}
      <div className="rounded-2xl p-6 text-white" style={{ background: setting.headerBg }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm opacity-75 uppercase tracking-wide">Overall Compliance Score</p>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-6xl font-bold">{overallScore}%</span>
              <span className="text-lg font-semibold" style={{ color: WA_COLORS.gold }}>
                {overallScore >= 90 ? "Survey Ready ✓" : overallScore >= 70 ? "Needs Attention" : "Action Required"}
              </span>
            </div>
            <p className="text-sm opacity-60 mt-1">{setting.primaryRegulation}</p>
          </div>
          <div className="space-y-2">
            {setting.keyRequirements.slice(0, 3).map((req) => (
              <p key={req} className="text-xs opacity-75 flex items-center gap-1">
                <span>•</span> {req}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Critical alerts */}
      {hasCritical && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🚨</span>
            <h3 className="font-bold text-red-900">Immediate Action Required</h3>
          </div>
          <div className="space-y-1.5">
            {bgOverdue > 0 && <Alert text={`${bgOverdue} background check${bgOverdue > 1 ? "s" : ""} overdue`} href="/compliance/background-checks" />}
            {tbOverdue > 0 && <Alert text={`${tbOverdue} TB assessment${tbOverdue > 1 ? "s" : ""} overdue`} href="/compliance/tb-assessments" />}
            {unreportedDoh > 0 && <Alert text={`${unreportedDoh} complaint${unreportedDoh > 1 ? "s" : ""} require DOH notification`} href="/compliance/complaints" />}
            {criticalLeft > 0 && <Alert text={`${criticalLeft} critical survey items incomplete`} href={`/compliance/${setting.slug}/survey`} />}
          </div>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Personnel Compliant" value={`${complianceRate}%`} sub={`${compliant}/${totalPersonnel} staff`}
          status={complianceRate >= 90 ? "green" : complianceRate >= 70 ? "amber" : "red"} href="/compliance/personnel" />
        <KPICard title="BG Checks" value={bgOverdue > 0 ? `${bgOverdue} Overdue` : bgDueSoon > 0 ? `${bgDueSoon} Due Soon` : "All Current"}
          sub={`${setting.primaryRegulation}`} status={bgOverdue > 0 ? "red" : bgDueSoon > 0 ? "amber" : "green"} href="/compliance/background-checks" />
        <KPICard title="Survey Readiness" value={`${surveyPct}%`} sub={`${surveyComplete}/${surveyTotal} items`}
          status={surveyPct >= 90 ? "green" : surveyPct >= 70 ? "amber" : "red"} href={`/compliance/${setting.slug}/survey`} />
        <KPICard title="Open Complaints" value={openComplaints} sub={unreportedDoh > 0 ? `${unreportedDoh} DOH report due` : "All reported"}
          status={openComplaints === 0 ? "green" : openComplaints <= 2 ? "amber" : "red"} href="/compliance/complaints" />
      </div>

      {/* Survey readiness link */}
      <div className={`rounded-2xl border-2 p-6 ${setting.accentBg} ${setting.accentBorder}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className={`text-lg font-bold ${setting.accentText}`}>
              {setting.label} Survey Readiness Checklist
            </h2>
            <p className="text-sm text-slate-600 mt-1">{setting.surveyChecklist.length} items · {setting.primaryRegulation}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {setting.keyRequirements.map((r) => (
                <span key={r} className={`text-xs px-2 py-0.5 rounded-full border ${setting.accentBg} ${setting.accentText} ${setting.accentBorder}`}>
                  {r}
                </span>
              ))}
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold" style={{ color: surveyPct >= 90 ? WA_COLORS.compliant : surveyPct >= 70 ? WA_COLORS.atRisk : WA_COLORS.nonCompliant }}>
              {surveyPct}%
            </div>
            <p className="text-xs text-slate-500 mt-1">{surveyComplete}/{surveyTotal} complete</p>
            <Link
              href={`/compliance/${setting.slug}/survey`}
              className="mt-2 inline-block px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90"
              style={{ background: setting.headerBg }}
            >
              Open Checklist →
            </Link>
          </div>
        </div>
      </div>

      {/* Shared module links */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-4">Compliance Modules</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { href: "/compliance/personnel",         label: "Personnel Files",   icon: "👥" },
            { href: "/compliance/background-checks", label: "Background Checks", icon: "🔍" },
            { href: "/compliance/tb-assessments",    label: "TB Assessments",    icon: "🫁" },
            { href: "/compliance/training",          label: "Training Logs",     icon: "📚" },
            { href: "/compliance/clients",           label: "Client Records",    icon: "🏠" },
            { href: "/compliance/complaints",        label: "Complaints",        icon: "📋" },
            { href: "/compliance/reports",           label: "Reports",           icon: "📄" },
            { href: `${setting.slug}/survey`,      label: `${setting.shortLabel} Survey`, icon: "✅" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href.startsWith("/") ? item.href : `/compliance/${item.href}`}
              className={`rounded-xl border-2 p-3 hover:shadow-md transition-all text-sm font-semibold flex items-center gap-2 ${setting.accentBg} ${setting.accentBorder} ${setting.accentText}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Alert({ text, href }: { text: string; href: string }) {
  return (
    <div className="flex items-center justify-between text-sm text-red-800">
      <span>• {text}</span>
      <Link href={href} className="font-bold underline hover:no-underline ml-4 shrink-0">Fix →</Link>
    </div>
  );
}

function KPICard({ title, value, sub, status, href }: {
  title: string; value: string | number; sub: string;
  status: "green" | "amber" | "red"; href: string;
}) {
  const cls = {
    green: "bg-emerald-50 border-emerald-200",
    amber: "bg-amber-50 border-amber-200",
    red:   "bg-red-50 border-red-200",
  };
  const val = {
    green: "text-emerald-700",
    amber: "text-amber-700",
    red:   "text-red-700",
  };
  return (
    <Link href={href} className={`rounded-xl border-2 p-4 hover:shadow-md transition-all ${cls[status]}`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${val[status]}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </Link>
  );
}
