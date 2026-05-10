import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import {
  statusBgClass, statusLabel, formatDate, dueDateLabel, dueDateBadge,
  WA_COLORS, fileCompletenessScore, getMissingDocuments, getExpiringDocuments,
} from "@/lib/compliance/waComplianceUtils";
import type { PersonnelCompliance } from "@/lib/types/wa-compliance";

export const dynamic = "force-dynamic";

export default async function PersonnelProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: person } = await supabase
    .from("personnel_compliance")
    .select("*")
    .eq("id", id)
    .eq("facility_id", profile.facility_id)
    .maybeSingle();

  if (!person) notFound();

  const p = person as PersonnelCompliance;
  const score = fileCompletenessScore(p);
  const missing = getMissingDocuments(p);
  const expiring = getExpiringDocuments(p);

  const CHECKLIST = [
    { label: "Background Check (Initial)",    wac: "WAC 246-335-085", date: p.bg_check_initial_date,             result: p.bg_check_initial_result },
    { label: "Background Check Renewal",      wac: "WAC 246-335-085", date: p.bg_check_renewal_date,            result: p.bg_check_renewal_result },
    { label: "TB Assessment (Initial)",        wac: "WAC 246-335-083", date: p.tb_assessment_initial_date,       result: p.tb_assessment_initial_result },
    { label: "TB Assessment (Annual)",         wac: "WAC 246-335-083", date: p.tb_assessment_last_date,          result: p.tb_assessment_last_result },
    { label: "Orientation Training",           wac: "WAC 246-335-080", date: p.orientation_complete_date,         result: null },
    { label: "Infection Control Training",     wac: "WAC 246-335-080", date: p.infection_control_training_date,   result: null },
    { label: "Bloodborne Pathogen Training",   wac: "WAC 246-335-080", date: p.bloodborne_pathogen_training_date, result: null },
    { label: "TB Training",                    wac: "WAC 246-335-080", date: p.tb_training_date,                 result: null },
    { label: "Mandatory Reporter Training",    wac: "WAC 246-335-080", date: p.mandatory_reporter_training_date, result: null },
    { label: "Emergency Preparedness Training",wac: "WAC 246-335-070", date: p.emergency_preparedness_training_date, result: null },
    { label: "Performance Evaluation",         wac: "WAC 246-335-080", date: p.last_performance_eval_date,       result: null },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/compliance/personnel" className="text-sm hover:underline" style={{ color: WA_COLORS.navy }}>
          ← Personnel List
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4 mt-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: WA_COLORS.navy }}>{p.employee_name}</h1>
            <p className="text-slate-500">{p.position} · Hired {formatDate(p.hire_date)}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-4 py-1.5 rounded-full border-2 font-bold text-sm ${statusBgClass(p.compliance_status)}`}>
              {statusLabel(p.compliance_status)}
            </span>
            <Link
              href={`/compliance/personnel/${p.id}/edit`}
              className="px-4 py-2 rounded-lg text-white text-sm font-bold"
              style={{ backgroundColor: WA_COLORS.navy }}
            >
              Edit Record
            </Link>
          </div>
        </div>
      </div>

      {/* Score + alerts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* File completeness */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">File Completeness</p>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl font-bold" style={{ color: score >= 90 ? WA_COLORS.compliant : score >= 70 ? WA_COLORS.atRisk : WA_COLORS.nonCompliant }}>
              {score}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${score}%`,
                backgroundColor: score >= 90 ? WA_COLORS.compliant : score >= 70 ? WA_COLORS.atRisk : WA_COLORS.nonCompliant,
              }}
            />
          </div>
        </div>

        {/* BG check */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">BG Check Renewal Due</p>
          <p className={`text-lg font-bold ${dueDateBadge(p.bg_check_renewal_due, 60).split(" ")[1]}`}>
            {formatDate(p.bg_check_renewal_due)}
          </p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${dueDateBadge(p.bg_check_renewal_due, 60)}`}>
            {dueDateLabel(p.bg_check_renewal_due)}
          </span>
          <p className="text-xs text-slate-400 mt-2">WAC 246-335-085 · 2-year cycle</p>
        </div>

        {/* TB assessment */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">TB Assessment Due</p>
          <p className="text-lg font-bold text-slate-900">{formatDate(p.tb_assessment_annual_due)}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${dueDateBadge(p.tb_assessment_annual_due, 30)}`}>
            {dueDateLabel(p.tb_assessment_annual_due)}
          </span>
          <p className="text-xs text-slate-400 mt-2">WAC 246-335-083 · Annual</p>
        </div>
      </div>

      {/* Missing & expiring */}
      {(missing.length > 0 || expiring.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {missing.length > 0 && (
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
              <h3 className="font-bold text-red-900 mb-2">Missing Documents ({missing.length})</h3>
              <ul className="space-y-1">
                {missing.map((doc) => (
                  <li key={doc} className="text-sm text-red-800 flex items-center gap-2">
                    <span className="text-red-500">✕</span> {doc}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {expiring.length > 0 && (
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
              <h3 className="font-bold text-amber-900 mb-2">Expiring Soon ({expiring.length})</h3>
              <ul className="space-y-1">
                {expiring.map((doc) => (
                  <li key={doc} className="text-sm text-amber-800 flex items-center gap-2">
                    <span className="text-amber-500">⚠</span> {doc}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Full compliance checklist */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b" style={{ backgroundColor: WA_COLORS.navy }}>
          <h2 className="font-bold text-white">WAC 246-335 Compliance Checklist</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b">
              <th className="p-3 text-left font-semibold text-slate-600">Requirement</th>
              <th className="p-3 text-left font-semibold text-slate-600">Regulation</th>
              <th className="p-3 text-left font-semibold text-slate-600">Date Completed</th>
              <th className="p-3 text-left font-semibold text-slate-600">Result / Status</th>
            </tr>
          </thead>
          <tbody>
            {CHECKLIST.map((item, i) => {
              const done = !!item.date;
              return (
                <tr key={i} className={`border-b ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={done ? "text-emerald-500" : "text-red-400"}>
                        {done ? "✓" : "✕"}
                      </span>
                      <span className={done ? "text-slate-900" : "text-red-700 font-medium"}>
                        {item.label}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-xs text-slate-400 font-mono">{item.wac}</span>
                  </td>
                  <td className="p-3 text-slate-700">
                    {item.date ? formatDate(item.date) : <span className="text-red-500 text-xs">Not on file</span>}
                  </td>
                  <td className="p-3">
                    {item.result ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        item.result === "clear" || item.result === "negative"
                          ? "bg-emerald-100 text-emerald-700"
                          : item.result === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {item.result.replace("_", " ")}
                      </span>
                    ) : done ? (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Complete</span>
                    ) : (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Missing</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {p.documentation_notes && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-2">Documentation Notes</h3>
          <p className="text-sm text-slate-600">{p.documentation_notes}</p>
        </div>
      )}

      {p.last_audited_date && (
        <p className="text-xs text-slate-400 text-right">Last audited: {formatDate(p.last_audited_date)}</p>
      )}
    </div>
  );
}
