import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { daysUntil, WA_COLORS } from "@/lib/compliance/waComplianceUtils";
import { ALL_COMPLIANCE_SETTINGS } from "@/lib/compliance/careSettingCompliance";

export const dynamic = "force-dynamic";

const SETTING_HEADER_COLORS: Record<string, string> = {
  "home-care":       "linear-gradient(135deg, #1a3a52, #274f6e)",
  "afh":             "linear-gradient(135deg, #92400e, #b45309)",
  "assisted-living": "linear-gradient(135deg, #4c1d95, #6d28d9)",
  "multi-service":   "linear-gradient(135deg, #134e4a, #0f766e)",
};

export default async function ComplianceHubPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const fid = profile.facility_id;
  const today = new Date().toISOString().split("T")[0];

  const rawSettings = profile.organizations?.care_settings as string[] | null;
  const activeSettings: string[] = (rawSettings && rawSettings.length > 0)
    ? rawSettings.map(s => s.toLowerCase().replace(/_/g, "-"))
    : ALL_COMPLIANCE_SETTINGS.map(s => s.id);

  const [personnelRes, complaintsRes, surveyRes] = await Promise.all([
    supabase.from("personnel_compliance").select("compliance_status, bg_check_renewal_due, tb_assessment_annual_due").eq("facility_id", fid),
    supabase.from("complaints").select("status").eq("facility_id", fid),
    supabase.from("survey_readiness").select("is_complete, care_setting").eq("facility_id", fid),
  ]);

  const personnel  = personnelRes.data ?? [];
  const complaints = complaintsRes.data ?? [];
  const surveyAll  = surveyRes.data ?? [];

  const totalPersonnel = personnel.length;
  const compliant      = personnel.filter((p) => p.compliance_status === "compliant").length;
  const complianceRate = totalPersonnel > 0 ? Math.round((compliant / totalPersonnel) * 100) : 0;
  const bgOverdue      = personnel.filter((p) => p.bg_check_renewal_due && p.bg_check_renewal_due < today).length;
  const tbOverdue      = personnel.filter((p) => p.tb_assessment_annual_due && p.tb_assessment_annual_due < today).length;
  const openComplaints = complaints.filter((c) => c.status === "open").length;

  // Survey readiness per setting
  function surveyPct(slug: string) {
    const items = surveyAll.filter((s) => s.care_setting === slug);
    if (!items.length) return null;
    return Math.round((items.filter((i) => i.is_complete).length / items.length) * 100);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: WA_COLORS.navy }}>
          Compliance Hub
        </h1>
        <p className="text-slate-500 mt-1">
          {profile.organizations?.name} · Washington State Care Compliance
        </p>
      </div>

      {/* Global snapshot */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Personnel Compliant", value: `${complianceRate}%`, sub: `${compliant}/${totalPersonnel}`, bad: complianceRate < 70 },
          { label: "BG Checks Overdue",   value: bgOverdue,            sub: "Need immediate action",         bad: bgOverdue > 0 },
          { label: "TB Overdue",          value: tbOverdue,            sub: "Annual assessment required",    bad: tbOverdue > 0 },
          { label: "Open Complaints",     value: openComplaints,       sub: "Requiring resolution",          bad: openComplaints > 0 },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border-2 p-4 shadow-sm ${s.bad && (typeof s.value === "number" ? s.value > 0 : parseInt(s.value) < 70) ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.bad && (typeof s.value === "number" ? s.value > 0 : parseInt(s.value) < 70) ? "text-red-700" : "text-slate-900"}`}>
              {s.value}
            </p>
            <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Per-setting cards */}
      <div>
        <h2 className="text-xl font-bold mb-4" style={{ color: WA_COLORS.navy }}>
          Care Setting Compliance Dashboards
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {ALL_COMPLIANCE_SETTINGS.map((setting) => {
            const pct = surveyPct(setting.slug);
            const isActive = activeSettings.includes(setting.id);
            return (
              <div key={setting.id}
                className={`rounded-2xl border shadow-sm overflow-hidden transition-all ${isActive ? "border-slate-200 hover:shadow-md" : "border-slate-100 opacity-50 grayscale"}`}>
                <div className="p-5 text-white relative" style={{ background: SETTING_HEADER_COLORS[setting.slug] }}>
                  {!isActive && (
                    <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center">
                      <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">
                        🔒 Not in your plan
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold">{setting.label}</h3>
                      <p className="text-xs opacity-75 mt-0.5">{setting.primaryRegulation} · {setting.regulatoryBody}</p>
                    </div>
                    {pct !== null && isActive && (
                      <div className="text-right">
                        <p className="text-3xl font-bold">{pct}%</p>
                        <p className="text-xs opacity-60">survey ready</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-5 space-y-3 bg-white">
                  <div className="space-y-1.5">
                    {setting.keyRequirements.slice(0, 3).map((req) => (
                      <p key={req} className="text-xs text-slate-500 flex items-center gap-1.5">
                        <span className="text-slate-300">•</span> {req}
                      </p>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    {isActive ? (
                      <Link
                        href={`/compliance/${setting.slug}`}
                        className="flex-1 text-center text-sm font-bold py-2 rounded-lg text-white hover:opacity-90 transition-opacity"
                        style={{ background: SETTING_HEADER_COLORS[setting.slug] }}
                      >
                        Dashboard →
                      </Link>
                    ) : (
                      <span className="flex-1 text-center text-sm font-medium py-2 rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed">
                        Not Available
                      </span>
                    )}
                    {isActive ? (
                      <Link
                        href={`/compliance/${setting.slug}/survey`}
                        className="flex-1 text-center text-sm font-semibold py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Survey Checklist →
                      </Link>
                    ) : (
                      <span className="flex-1 text-center text-sm font-medium py-2 rounded-lg bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100">
                        Survey Checklist
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick shared links */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-3">Shared Compliance Modules</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/compliance/personnel",         label: "Personnel Files",   icon: "👥" },
            { href: "/compliance/training",          label: "Training Logs",     icon: "📚" },
            { href: "/compliance/clients",           label: "Client Records",    icon: "🏠" },
            { href: "/compliance/complaints",        label: "Complaints",        icon: "📋" },
            { href: "/compliance/background-checks", label: "Background Checks", icon: "🔍" },
            { href: "/compliance/tb-assessments",    label: "TB Assessments",    icon: "🫁" },
            { href: "/compliance/reports",           label: "Reports",           icon: "📄" },
            { href: "/compliance/personnel/new",     label: "Add Staff Record",  icon: "➕" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-slate-200 p-3 flex items-center gap-2 hover:shadow-md transition-all text-sm font-medium text-slate-700 hover:text-blue-700 hover:border-blue-200"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Regulatory reference */}
      <div className="rounded-xl p-4 text-sm" style={{ borderLeft: `4px solid ${WA_COLORS.gold}`, backgroundColor: WA_COLORS.navy + "08" }}>
        <p className="font-bold" style={{ color: WA_COLORS.navy }}>Washington State Regulatory Reference</p>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600">
          {[
            ["WAC 246-335", "Home Care Agencies (DOH)"],
            ["WAC 388-76", "Adult Family Homes (DSHS)"],
            ["WAC 388-78A", "Assisted Living (DSHS)"],
            ["WAC 246-335-085", "Background Checks"],
          ].map(([wac, desc]) => (
            <div key={wac} className="bg-white rounded-lg p-2 border border-slate-200">
              <p className="font-mono font-semibold text-blue-700">{wac}</p>
              <p className="text-slate-500 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
