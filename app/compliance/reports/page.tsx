import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { formatDate, daysUntil, WA_COLORS } from "@/lib/compliance/waComplianceUtils";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const fid = profile.facility_id;
  const orgName = profile.organizations?.name ?? "Agency";
  const today = new Date().toISOString().split("T")[0];
  const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const [personnelRes, trainingRes, clientsRes, complaintsRes, surveyRes] = await Promise.all([
    supabase.from("personnel_compliance").select("*").eq("facility_id", fid),
    supabase.from("training_records").select("*").eq("facility_id", fid),
    supabase.from("client_documentation").select("*").eq("facility_id", fid),
    supabase.from("complaints").select("*").eq("facility_id", fid),
    supabase.from("survey_readiness").select("is_complete, priority").eq("facility_id", fid),
  ]);

  const personnel   = personnelRes.data ?? [];
  const training    = trainingRes.data ?? [];
  const clients     = clientsRes.data ?? [];
  const complaints  = complaintsRes.data ?? [];
  const survey      = surveyRes.data ?? [];

  const totalPersonnel = personnel.length;
  const compliant      = personnel.filter((p) => p.compliance_status === "compliant").length;
  const complianceRate = totalPersonnel > 0 ? Math.round((compliant / totalPersonnel) * 100) : 0;
  const bgOverdue      = personnel.filter((p) => p.bg_check_renewal_due && p.bg_check_renewal_due < today).length;
  const tbOverdue      = personnel.filter((p) => p.tb_assessment_annual_due && p.tb_assessment_annual_due < today).length;
  const bgDueSoon      = personnel.filter((p) => { const d = daysUntil(p.bg_check_renewal_due); return d !== null && d >= 0 && d <= 60; }).length;

  const totalClients    = clients.length;
  const clientComplete  = clients.filter((c) => c.documentation_status === "complete").length;
  const clientCritical  = clients.filter((c) => c.documentation_status === "critical_gaps").length;

  const openComplaints     = complaints.filter((c) => c.status === "open").length;
  const unreportedDoh      = complaints.filter((c) => c.doh_notification_required && !c.doh_reported_date).length;
  const avgResolutionDays  = (() => {
    const resolved = complaints.filter((c) => c.resolved_date && c.complaint_date);
    if (!resolved.length) return null;
    const avg = resolved.reduce((sum, c) => {
      return sum + Math.abs(Math.ceil((new Date(c.resolved_date).getTime() - new Date(c.complaint_date).getTime()) / 86400000));
    }, 0) / resolved.length;
    return Math.round(avg);
  })();

  const surveyTotal    = survey.length;
  const surveyComplete = survey.filter((s) => s.is_complete).length;
  const surveyPct      = surveyTotal > 0 ? Math.round((surveyComplete / surveyTotal) * 100) : 0;
  const criticalLeft   = survey.filter((s) => !s.is_complete && s.priority === "critical").length;

  const trainingTypes = new Set(training.map((t) => t.training_type));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: WA_COLORS.navy }}>Compliance Report</h1>
          <p className="text-slate-500 text-sm mt-0.5">WAC 246-335 · Generated {reportDate}</p>
        </div>
        <button
          onClick={undefined}
          className="px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90 print:hidden"
          style={{ backgroundColor: WA_COLORS.navy }}
          // Use browser print
          {...{ onClick: "window.print()" } as object}
        >
          🖨 Print / Save PDF
        </button>
      </div>

      {/* Report content */}
      <div className="space-y-6 print:space-y-4" id="compliance-report">
        {/* Header */}
        <div className="rounded-2xl p-6 text-white" style={{ background: `linear-gradient(135deg, ${WA_COLORS.navy}, #274f6e)` }}>
          <h2 className="text-2xl font-bold">{orgName}</h2>
          <p className="opacity-80 mt-1">Washington State WAC 246-335 Compliance Report</p>
          <p className="mt-1 text-sm opacity-60">Generated: {reportDate}</p>
        </div>

        {/* Overall score */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Personnel Compliance", value: `${complianceRate}%`, note: `${compliant}/${totalPersonnel} compliant` },
            { label: "Client Documentation", value: `${totalClients > 0 ? Math.round((clientComplete / totalClients) * 100) : 0}%`, note: `${clientComplete}/${totalClients} complete` },
            { label: "Survey Readiness",    value: `${surveyPct}%`,      note: `${surveyComplete}/${surveyTotal} items done` },
            { label: "Open Complaints",     value: openComplaints,       note: unreportedDoh > 0 ? `${unreportedDoh} DOH report due` : "All reported" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{s.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: WA_COLORS.navy }}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-1">{s.note}</p>
            </div>
          ))}
        </div>

        {/* Personnel section */}
        <Section title="Personnel Compliance" wac="WAC 246-335-080 / 083 / 085" navy={WA_COLORS.navy}>
          <Row label="Total staff tracked"          value={totalPersonnel} />
          <Row label="Compliant staff"              value={`${compliant} (${complianceRate}%)`} good={complianceRate >= 90} />
          <Row label="Background checks overdue"   value={bgOverdue}  bad={bgOverdue > 0} />
          <Row label="BG checks due within 60 days" value={bgDueSoon} warn={bgDueSoon > 0} />
          <Row label="TB assessments overdue"       value={tbOverdue} bad={tbOverdue > 0} />
          <Row label="Training records logged"      value={training.length} />
          <Row label="Training types covered"       value={trainingTypes.size} />
        </Section>

        {/* Client records */}
        <Section title="Client Documentation" wac="WAC 246-335-055 / 065" navy={WA_COLORS.navy}>
          <Row label="Total clients tracked"       value={totalClients} />
          <Row label="Documentation complete"      value={clientComplete} good={clientComplete === totalClients && totalClients > 0} />
          <Row label="Critical documentation gaps" value={clientCritical} bad={clientCritical > 0} />
        </Section>

        {/* Complaints */}
        <Section title="Complaints & Incident Management" wac="WAC 246-335-045" navy={WA_COLORS.navy}>
          <Row label="Total complaints logged"          value={complaints.length} />
          <Row label="Open complaints"                  value={openComplaints} bad={openComplaints > 0} />
          <Row label="DOH notifications unreported"     value={unreportedDoh}  bad={unreportedDoh > 0} />
          <Row label="Average resolution time"          value={avgResolutionDays !== null ? `${avgResolutionDays} days` : "N/A"} />
        </Section>

        {/* Survey readiness */}
        <Section title="DOH Survey Readiness" wac="WAC 246-335" navy={WA_COLORS.navy}>
          <Row label="Checklist items complete"         value={`${surveyComplete}/${surveyTotal} (${surveyPct}%)`} good={surveyPct >= 90} />
          <Row label="Critical items remaining"         value={criticalLeft} bad={criticalLeft > 0} />
          <Row label="Readiness status"                 value={surveyPct >= 90 ? "Survey Ready" : surveyPct >= 70 ? "Nearly Ready" : "Needs Work"} />
        </Section>

        {/* Footer */}
        <div className="rounded-xl p-4 text-xs text-slate-500 border border-slate-200 bg-slate-50">
          <p className="font-semibold text-slate-700 mb-1">Report Notes</p>
          <p>This report was generated from CareCompliance dashboard data for {orgName}. Compliance with WAC 246-335 is required for Washington State home care agency licensing. This report should be reviewed by the Administrator and retained for agency records. For official compliance verification, consult your agency&apos;s most current regulatory filings and DOH correspondence.</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, wac, navy, children }: { title: string; wac: string; navy: string; children: React.ReactNode }) {
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
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-sm ${cls}`}>{value}</span>
    </div>
  );
}
