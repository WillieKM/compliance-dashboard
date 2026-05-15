import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@supabase/supabase-js";
import { WA_COLORS } from "@/lib/compliance/waComplianceUtils";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ReportsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const db  = admin();
  const fid = profile.facility_id;
  const orgName    = profile.organizations?.name ?? "Agency";
  const careSetting = (profile.organizations?.care_settings as string[] | null)?.[0] ?? "HOME_CARE";
  const today      = new Date().toISOString().split("T")[0];
  const reportDate = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const [
    personnelRes, trainingRes, clientsRes, complaintsRes,
    surveyRes, staffRes, residentsRes, alertsRes,
  ] = await Promise.all([
    db.from("personnel_compliance").select("*").eq("facility_id", fid),
    db.from("training_records").select("*").eq("facility_id", fid).order("training_date", { ascending: false }),
    db.from("client_documentation").select("*").eq("facility_id", fid),
    db.from("complaints").select("*").eq("facility_id", fid).order("complaint_date", { ascending: false }),
    db.from("survey_readiness").select("*").eq("facility_id", fid),
    db.from("staff").select("id, first_name, last_name, role, status").eq("facility_id", fid),
    db.from("residents").select("id, first_name, last_name, status, room_number").eq("facility_id", fid),
    db.from("alerts").select("*").eq("facility_id", fid).eq("resolved", false).order("due_date"),
  ]);

  const personnel  = personnelRes.data ?? [];
  const training   = trainingRes.data ?? [];
  const clients    = clientsRes.data ?? [];
  const complaints = complaintsRes.data ?? [];
  const survey     = surveyRes.data ?? [];
  const staff      = staffRes.data ?? [];
  const residents  = residentsRes.data ?? [];
  const alerts     = alertsRes.data ?? [];

  // Personnel metrics
  const compliant      = personnel.filter(p => p.compliance_status === "compliant").length;
  const atRisk         = personnel.filter(p => p.compliance_status === "at_risk").length;
  const nonCompliant   = personnel.filter(p => p.compliance_status === "non_compliant").length;
  const complianceRate = personnel.length > 0 ? Math.round((compliant / personnel.length) * 100) : 0;
  const bgOverdue      = personnel.filter(p => p.bg_check_renewal_due && p.bg_check_renewal_due < today).length;
  const bgDueSoon      = personnel.filter(p => { const d = p.bg_check_renewal_due; return d && d >= today && new Date(d) <= new Date(Date.now() + 60*86400000); }).length;
  const tbOverdue      = personnel.filter(p => p.tb_assessment_annual_due && p.tb_assessment_annual_due < today).length;
  const missingOrientation  = personnel.filter(p => !p.orientation_complete_date).length;
  const missingBloodborne   = personnel.filter(p => !p.bloodborne_pathogen_training_date).length;
  const missingMandatory    = personnel.filter(p => !p.mandatory_reporter_training_date).length;

  // Client metrics
  const clientComplete = clients.filter(c => c.documentation_status === "complete").length;
  const clientGaps     = clients.filter(c => c.documentation_status === "gaps" || c.documentation_status === "critical_gaps").length;
  const clientCritical = clients.filter(c => c.documentation_status === "critical_gaps").length;
  const clientRate     = clients.length > 0 ? Math.round((clientComplete / clients.length) * 100) : 0;

  // Complaints
  const openComplaints    = complaints.filter(c => c.status === "open" || c.status === "under_investigation").length;
  const unreportedDoh     = complaints.filter(c => c.doh_notification_required && !c.doh_reported_date).length;
  const resolvedThisYear  = complaints.filter(c => c.resolved_date?.startsWith(new Date().getFullYear().toString())).length;

  // Survey
  const surveyComplete  = survey.filter(s => s.is_complete).length;
  const surveyPct       = survey.length > 0 ? Math.round((surveyComplete / survey.length) * 100) : 0;
  const criticalLeft    = survey.filter(s => !s.is_complete && s.priority === "critical").length;

  // Overall score
  const overallScore = Math.round((complianceRate + surveyPct + clientRate) / 3);

  // Expiring items
  const expiringBg  = personnel.filter(p => p.bg_check_renewal_due && new Date(p.bg_check_renewal_due) <= new Date(Date.now() + 30*86400000) && p.bg_check_renewal_due >= today);
  const expiringTb  = personnel.filter(p => p.tb_assessment_annual_due && new Date(p.tb_assessment_annual_due) <= new Date(Date.now() + 30*86400000) && p.tb_assessment_annual_due >= today);

  const SETTING_LABELS: Record<string, string> = {
    HOME_CARE: "Home Care Agency — WAC 246-335",
    AFH: "Adult Family Home — WAC 388-76",
    ASSISTED_LIVING: "Assisted Living Facility — WAC 388-78A",
    MULTI_SERVICE: "Multi-Service Agency",
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Controls — print only */}
      <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: WA_COLORS.navy }}>Compliance Report</h1>
          <p className="text-slate-500 text-sm mt-0.5">Generated {reportDate}</p>
        </div>
        <div className="flex gap-3">
          <PrintButton />
        </div>
      </div>

      <div id="compliance-report" className="space-y-6">
        {/* Report Header */}
        <div className="rounded-2xl p-6 text-white" style={{ background: `linear-gradient(135deg, ${WA_COLORS.navy}, #274f6e)` }}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Compliance Report</p>
              <h2 className="text-3xl font-bold">{orgName}</h2>
              <p className="text-white/80 mt-1">{SETTING_LABELS[careSetting] ?? careSetting}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs">Report Date</p>
              <p className="text-white font-semibold">{reportDate}</p>
              <div className="mt-3">
                <p className="text-white/60 text-xs">Overall Score</p>
                <p className="text-4xl font-bold" style={{ color: overallScore >= 90 ? "#86efac" : overallScore >= 70 ? "#fcd34d" : "#fca5a5" }}>
                  {overallScore}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Score cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Personnel",        value: `${complianceRate}%`, sub: `${compliant}/${personnel.length}`,      color: complianceRate >= 90 ? "emerald" : complianceRate >= 70 ? "amber" : "red" },
            { label: "Client Docs",      value: `${clientRate}%`,     sub: `${clientComplete}/${clients.length}`,   color: clientRate >= 90 ? "emerald" : clientRate >= 70 ? "amber" : "red" },
            { label: "Survey Ready",     value: `${surveyPct}%`,      sub: `${surveyComplete}/${survey.length}`,    color: surveyPct >= 90 ? "emerald" : surveyPct >= 70 ? "amber" : "red" },
            { label: "Active Alerts",    value: alerts.length,        sub: `${openComplaints} open complaints`,     color: alerts.length === 0 ? "emerald" : "amber" },
          ].map(s => {
            const clr = s.color === "emerald" ? "#10b981" : s.color === "amber" ? "#f59e0b" : "#ef4444";
            return (
              <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{s.label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: clr }}>{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Personnel Compliance Detail */}
        <ReportSection title="Personnel Compliance" wac="WAC 246-335-080 / 083 / 085" navy={WA_COLORS.navy}>
          <Row label="Total staff on file"             value={staff.length} />
          <Row label="Staff with compliance records"   value={personnel.length} />
          <Row label="Compliant"                       value={`${compliant} (${complianceRate}%)`} good={complianceRate >= 90} />
          <Row label="At risk (expiring within 30 days)" value={atRisk} warn={atRisk > 0} />
          <Row label="Non-compliant"                   value={nonCompliant} bad={nonCompliant > 0} />
          <Row label="Background checks overdue"       value={bgOverdue} bad={bgOverdue > 0} />
          <Row label="BG checks due within 60 days"    value={bgDueSoon} warn={bgDueSoon > 0} />
          <Row label="TB assessments overdue"          value={tbOverdue} bad={tbOverdue > 0} />
          <Row label="Missing orientation training"    value={missingOrientation} bad={missingOrientation > 0} />
          <Row label="Missing bloodborne pathogen"     value={missingBloodborne} bad={missingBloodborne > 0} />
          <Row label="Missing mandatory reporter"      value={missingMandatory} bad={missingMandatory > 0} />
          <Row label="Training records on file"        value={training.length} />
        </ReportSection>

        {/* Expiring items */}
        {(expiringBg.length > 0 || expiringTb.length > 0) && (
          <ReportSection title="Expiring Within 30 Days" wac="Immediate attention required" navy="#b45309">
            {expiringBg.map(p => (
              <Row key={p.id} label={`${p.employee_name} — Background Check`} value={fmt(p.bg_check_renewal_due)} warn />
            ))}
            {expiringTb.map(p => (
              <Row key={p.id} label={`${p.employee_name} — TB Assessment`} value={fmt(p.tb_assessment_annual_due)} warn />
            ))}
          </ReportSection>
        )}

        {/* Staff list */}
        {staff.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ backgroundColor: WA_COLORS.navy + "10" }}>
              <h3 className="font-bold" style={{ color: WA_COLORS.navy }}>Staff Roster ({staff.length})</h3>
              <span className="text-xs font-mono text-slate-400">Current as of {reportDate}</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 text-left font-semibold text-slate-600">Name</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Role</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Compliance</th>
                  <th className="p-3 text-left font-semibold text-slate-600">BG Check Due</th>
                  <th className="p-3 text-left font-semibold text-slate-600">TB Due</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s, i) => {
                  const pc = personnel.find(p => p.staff_id === s.id);
                  const statusCls = pc?.compliance_status === "compliant" ? "text-emerald-600" : pc?.compliance_status === "at_risk" ? "text-amber-600" : "text-red-600";
                  const bgDue = pc?.bg_check_renewal_due;
                  const tbDue = pc?.tb_assessment_annual_due;
                  return (
                    <tr key={s.id} className={`border-b ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                      <td className="p-3 font-medium text-slate-900">{s.first_name} {s.last_name}</td>
                      <td className="p-3 text-slate-600">{s.role || "—"}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${s.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {s.status || "active"}
                        </span>
                      </td>
                      <td className={`p-3 text-xs font-semibold capitalize ${statusCls}`}>
                        {pc?.compliance_status?.replace("_", " ") ?? "No record"}
                      </td>
                      <td className={`p-3 text-xs ${bgDue && bgDue < today ? "text-red-600 font-bold" : "text-slate-600"}`}>{fmt(bgDue ?? null)}</td>
                      <td className={`p-3 text-xs ${tbDue && tbDue < today ? "text-red-600 font-bold" : "text-slate-600"}`}>{fmt(tbDue ?? null)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Client Documentation */}
        <ReportSection title="Client Documentation" wac="WAC 246-335-055 / 065" navy={WA_COLORS.navy}>
          <Row label="Total residents on file"         value={residents.length} />
          <Row label="Client records tracked"          value={clients.length} />
          <Row label="Documentation complete"          value={`${clientComplete} (${clientRate}%)`} good={clientRate >= 90} />
          <Row label="Documentation gaps"              value={clientGaps} warn={clientGaps > 0} />
          <Row label="Critical gaps"                   value={clientCritical} bad={clientCritical > 0} />
        </ReportSection>

        {/* Residents list */}
        {residents.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ backgroundColor: WA_COLORS.navy + "10" }}>
              <h3 className="font-bold" style={{ color: WA_COLORS.navy }}>Resident Census ({residents.length})</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 text-left font-semibold text-slate-600">Name</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Room</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Documentation</th>
                </tr>
              </thead>
              <tbody>
                {residents.map((r, i) => {
                  const cd = clients.find(c => c.resident_id === r.id);
                  return (
                    <tr key={r.id} className={`border-b ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                      <td className="p-3 font-medium text-slate-900">{r.first_name} {r.last_name}</td>
                      <td className="p-3 text-slate-600">{r.room_number || "—"}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {r.status || "Active"}
                        </span>
                      </td>
                      <td className="p-3">
                        {cd ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cd.documentation_status === "complete" ? "bg-emerald-100 text-emerald-700" : cd.documentation_status === "critical_gaps" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                            {cd.documentation_status?.replace("_", " ")}
                          </span>
                        ) : <span className="text-xs text-slate-400">No record</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Complaints */}
        <ReportSection title="Complaints & Incidents" wac="WAC 246-335-045" navy={WA_COLORS.navy}>
          <Row label="Total complaints on record"      value={complaints.length} />
          <Row label="Open / under investigation"      value={openComplaints} bad={openComplaints > 0} />
          <Row label="DOH notifications pending"       value={unreportedDoh} bad={unreportedDoh > 0} />
          <Row label="Resolved this year"              value={resolvedThisYear} good={resolvedThisYear > 0} />
        </ReportSection>

        {/* Active alerts */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ backgroundColor: "#fef2f2" }}>
              <h3 className="font-bold text-red-900">Active Alerts ({alerts.length})</h3>
              <span className="text-xs font-mono text-red-400">Requires action</span>
            </div>
            <div className="divide-y divide-slate-50">
              {alerts.slice(0, 20).map(a => (
                <div key={a.id} className="px-5 py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                    <p className="text-xs text-slate-500">{a.message}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${a.alert_type === "expired_document" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                    {a.alert_type?.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Survey Readiness */}
        <ReportSection title="DOH Survey Readiness" wac="WAC 246-335" navy={WA_COLORS.navy}>
          <Row label="Total checklist items"           value={survey.length} />
          <Row label="Completed"                       value={`${surveyComplete} (${surveyPct}%)`} good={surveyPct >= 90} />
          <Row label="Critical items remaining"        value={criticalLeft} bad={criticalLeft > 0} />
          <Row label="Readiness status"                value={surveyPct >= 90 ? "✓ Survey Ready" : surveyPct >= 70 ? "Nearly Ready" : "Needs Work"} good={surveyPct >= 90} warn={surveyPct >= 70 && surveyPct < 90} bad={surveyPct < 70} />
        </ReportSection>

        {/* Footer */}
        <div className="rounded-xl p-5 text-xs text-slate-500 border border-slate-200 bg-slate-50">
          <p className="font-semibold text-slate-700 mb-2">Certification Statement</p>
          <p className="mb-3">
            This compliance report was generated by CareCompliance for <strong>{orgName}</strong> on {reportDate}.
            All data reflects current records in the compliance management system.
            This report should be reviewed and signed by the Administrator and retained in agency records for a minimum of 5 years.
          </p>
          <div className="grid grid-cols-2 gap-8 mt-4 pt-4 border-t border-slate-200">
            <div>
              <p className="font-semibold text-slate-600 mb-4">Administrator Signature</p>
              <div className="border-b border-slate-400 mb-1" style={{ height: "2rem" }} />
              <p className="text-slate-400">Signature &amp; Date</p>
            </div>
            <div>
              <p className="font-semibold text-slate-600 mb-4">Title / Position</p>
              <div className="border-b border-slate-400 mb-1" style={{ height: "2rem" }} />
              <p className="text-slate-400">Print Name</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportSection({ title, wac, navy, children }: { title: string; wac: string; navy: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ backgroundColor: navy + "10" }}>
        <h3 className="font-bold" style={{ color: navy }}>{title}</h3>
        <span className="text-xs font-mono text-slate-400">{wac}</span>
      </div>
      <div className="divide-y divide-slate-50">{children}</div>
    </div>
  );
}

function Row({ label, value, good, bad, warn }: { label: string; value: string | number; good?: boolean; bad?: boolean; warn?: boolean }) {
  const cls = bad ? "text-red-600 font-bold" : warn ? "text-amber-600 font-semibold" : good ? "text-emerald-600 font-semibold" : "text-slate-900 font-medium";
  return (
    <div className="flex items-center justify-between px-5 py-2.5">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-sm ${cls}`}>{value}</span>
    </div>
  );
}
