import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { daysUntil, WA_COLORS } from "@/lib/compliance/waComplianceUtils";
import type { ComplianceSetting } from "@/lib/compliance/careSettingCompliance";
import SettingComplianceLayout from "./SettingComplianceLayout";

export const dynamic = "force-dynamic";

export default async function SettingCompliancePage({ setting }: { setting: ComplianceSetting }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const fid = profile.facility_id;
  const today = new Date().toISOString().split("T")[0];

  const [personnelRes, complaintsRes, clientsRes, surveyRes, trainingRes] = await Promise.all([
    supabase.from("personnel_compliance").select("compliance_status, bg_check_renewal_due, tb_assessment_annual_due").eq("facility_id", fid),
    supabase.from("complaints").select("status, doh_notification_required, doh_reported_date").eq("facility_id", fid),
    supabase.from("client_documentation").select("documentation_status").eq("facility_id", fid),
    supabase.from("survey_readiness").select("is_complete, priority").eq("facility_id", fid).eq("care_setting", setting.slug),
    supabase.from("training_records").select("certification_expiration").eq("facility_id", fid),
  ]);

  const personnel  = personnelRes.data ?? [];
  const complaints = complaintsRes.data ?? [];
  const clients    = clientsRes.data ?? [];
  const survey     = surveyRes.data ?? [];
  const training   = trainingRes.data ?? [];

  const total       = personnel.length;
  const compliant   = personnel.filter((p) => p.compliance_status === "compliant").length;
  const pctStaff    = total > 0 ? Math.round((compliant / total) * 100) : 0;
  const bgOverdue   = personnel.filter((p) => p.bg_check_renewal_due && p.bg_check_renewal_due < today).length;
  const tbOverdue   = personnel.filter((p) => p.tb_assessment_annual_due && p.tb_assessment_annual_due < today).length;
  const bgSoon      = personnel.filter((p) => { const d = daysUntil(p.bg_check_renewal_due); return d !== null && d >= 0 && d <= 60; }).length;
  const openCmplnts = complaints.filter((c) => c.status === "open").length;
  const dohDue      = complaints.filter((c) => c.doh_notification_required && !c.doh_reported_date).length;
  const clientGaps  = clients.filter((c) => c.documentation_status === "gaps" || c.documentation_status === "critical_gaps").length;
  const certExpiring = training.filter((t) => { const d = daysUntil(t.certification_expiration); return d !== null && d >= 0 && d <= 60; }).length;

  const surveyTotal    = survey.length;
  const surveyComplete = survey.filter((s) => s.is_complete).length;
  const surveyPct      = surveyTotal > 0 ? Math.round((surveyComplete / surveyTotal) * 100) : 0;
  const criticalLeft   = survey.filter((s) => !s.is_complete && s.priority === "critical").length;
  const overallScore   = Math.round((pctStaff + surveyPct) / 2);

  const base = `/dashboard/${setting.slug}/compliance`;
  // Shared modules live at /compliance/* — only survey is setting-specific
  const shared = "/compliance";

  return (
    <SettingComplianceLayout
      settingSlug={setting.slug}
      settingLabel={setting.label}
      settingReg={setting.primaryRegulation}
      headerBg={setting.headerBg}
    >
      {/* Score banner */}
      <div className="rounded-2xl p-5 text-white mb-6" style={{ background: setting.headerBg }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs opacity-70 uppercase tracking-wide">Overall Compliance Score</p>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-5xl font-bold">{overallScore}%</span>
              <span className="text-base font-semibold" style={{ color: "#d4a574" }}>
                {overallScore >= 90 ? "Survey Ready ✓" : overallScore >= 70 ? "Needs Attention" : "Action Required"}
              </span>
            </div>
            <p className="text-xs opacity-50 mt-1">{setting.primaryRegulation} · {setting.regulatoryBody}</p>
          </div>
          <div className="space-y-1">
            {setting.keyRequirements.slice(0, 3).map((r) => (
              <p key={r} className="text-xs opacity-70">• {r}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Critical alerts */}
      {(bgOverdue > 0 || tbOverdue > 0 || dohDue > 0 || criticalLeft > 0) && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 mb-6">
          <p className="font-bold text-red-900 mb-2">🚨 Immediate Action Required</p>
          <div className="space-y-1.5">
            {bgOverdue > 0 && <AlertRow text={`${bgOverdue} background check${bgOverdue > 1 ? "s" : ""} overdue`} href={`${base}/personnel`} />}
            {tbOverdue > 0 && <AlertRow text={`${tbOverdue} TB assessment${tbOverdue > 1 ? "s" : ""} overdue`} href={`${base}/personnel`} />}
            {dohDue > 0 && <AlertRow text={`${dohDue} complaint${dohDue > 1 ? "s" : ""} require DOH notification`} href={`${base}/complaints`} />}
            {criticalLeft > 0 && <AlertRow text={`${criticalLeft} critical survey items incomplete`} href={`${base}/survey`} />}
          </div>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="Staff Compliant" value={`${pctStaff}%`} sub={`${compliant}/${total}`}
          status={pctStaff >= 90 ? "green" : pctStaff >= 70 ? "amber" : "red"} href={`${base}/personnel`} />
        <KPICard title="BG / TB Status"
          value={bgOverdue + tbOverdue > 0 ? `${bgOverdue + tbOverdue} Overdue` : bgSoon > 0 ? `${bgSoon} Due Soon` : "All Current"}
          sub="Background + TB checks"
          status={bgOverdue + tbOverdue > 0 ? "red" : bgSoon > 0 ? "amber" : "green"} href={`${base}/personnel`} />
        <KPICard title="Survey Readiness" value={`${surveyPct}%`} sub={`${surveyComplete}/${surveyTotal} items`}
          status={surveyPct >= 90 ? "green" : surveyPct >= 70 ? "amber" : "red"} href={`${base}/survey`} />
        <KPICard title="Open Complaints" value={openCmplnts}
          sub={dohDue > 0 ? `${dohDue} DOH report due` : "All reported"}
          status={openCmplnts === 0 ? "green" : openCmplnts <= 2 ? "amber" : "red"} href={`${base}/complaints`} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KPICard title="Client Doc Gaps" value={clientGaps} sub="Need documentation"
          status={clientGaps === 0 ? "green" : clientGaps <= 3 ? "amber" : "red"} href={`${base}/clients`} />
        <KPICard title="Certs Expiring" value={certExpiring} sub="Within 60 days"
          status={certExpiring === 0 ? "green" : certExpiring <= 2 ? "amber" : "red"} href={`${base}/training`} />
        <KPICard title="Setting" value={setting.shortLabel} sub={setting.primaryRegulation}
          status="green" href={`${base}/survey`} />
      </div>

      {/* Setting-specific requirements */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-6">
        <h3 className="font-bold text-slate-900 mb-3">
          {setting.label} Key Requirements
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {setting.keyRequirements.map((req) => (
            <div key={req} className={`rounded-lg p-3 text-sm ${setting.accentBg} ${setting.accentBorder} border`}>
              <span className={`font-medium ${setting.accentText}`}>• {req}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick access modules */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-3">Compliance Modules</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { href: `${base}/survey`,          label: "Survey Readiness", icon: "✅", sub: `${surveyComplete}/${surveyTotal} done` },
            { href: `${shared}/personnel`,     label: "Personnel Files",  icon: "👥", sub: `${pctStaff}% compliant` },
            { href: `${shared}/training`,      label: "Training Logs",    icon: "📚", sub: `${certExpiring} certs expiring` },
            { href: `${shared}/clients`,       label: "Client Records",   icon: "🏠", sub: `${clientGaps} gaps` },
            { href: `${shared}/complaints`,    label: "Complaints",       icon: "📋", sub: `${openCmplnts} open` },
            { href: `${shared}/reports`,       label: "Reports",          icon: "📄", sub: "Generate PDF" },
          ].map((m) => (
            <Link key={m.href} href={m.href}
              className={`rounded-xl border-2 p-3 hover:shadow-md transition-all ${setting.accentBg} ${setting.accentBorder}`}>
              <span className="text-xl block mb-1">{m.icon}</span>
              <p className={`text-sm font-bold ${setting.accentText}`}>{m.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{m.sub}</p>
            </Link>
          ))}
        </div>
      </div>
    </SettingComplianceLayout>
  );
}

function AlertRow({ text, href }: { text: string; href: string }) {
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
  const cls = { green: "bg-emerald-50 border-emerald-200", amber: "bg-amber-50 border-amber-200", red: "bg-red-50 border-red-200" };
  const val = { green: "text-emerald-700", amber: "text-amber-700", red: "text-red-700" };
  return (
    <Link href={href} className={`rounded-xl border-2 p-4 hover:shadow-md transition-all ${cls[status]}`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${val[status]}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </Link>
  );
}
