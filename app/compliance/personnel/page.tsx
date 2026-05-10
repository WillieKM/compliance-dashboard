import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import {
  statusBgClass, statusLabel, dueDateLabel, dueDateBadge,
  formatDate, WA_COLORS, fileCompletenessScore,
} from "@/lib/compliance/waComplianceUtils";
import type { PersonnelCompliance } from "@/lib/types/wa-compliance";

export const dynamic = "force-dynamic";

export default async function PersonnelPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  // Get personnel compliance records joined with staff
  const { data: personnel } = await supabase
    .from("personnel_compliance")
    .select("*")
    .eq("facility_id", profile.facility_id)
    .order("employee_name");

  // Also get staff without personnel_compliance records
  const { data: allStaff } = await supabase
    .from("staff")
    .select("id, first_name, last_name, role")
    .eq("facility_id", profile.facility_id);

  const records = (personnel ?? []) as PersonnelCompliance[];
  const staffWithRecords = new Set(records.map((r) => r.staff_id));
  const staffWithoutRecords = (allStaff ?? []).filter((s) => !staffWithRecords.has(s.id));

  const compliant    = records.filter((r) => r.compliance_status === "compliant").length;
  const atRisk       = records.filter((r) => r.compliance_status === "at_risk").length;
  const nonCompliant = records.filter((r) => r.compliance_status === "non_compliant").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: WA_COLORS.navy }}>Personnel Compliance</h1>
          <p className="text-slate-500 text-sm mt-0.5">WAC 246-335-080 / 083 / 085 · Background checks, TB assessments, training</p>
        </div>
        <Link
          href="/compliance/personnel/new"
          className="px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90"
          style={{ backgroundColor: WA_COLORS.navy }}
        >
          + Add Personnel Record
        </Link>
      </div>

      {/* Summary bars */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Compliant",    count: compliant,    cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
          { label: "At Risk",      count: atRisk,       cls: "bg-amber-100 text-amber-800 border-amber-200" },
          { label: "Non-Compliant",count: nonCompliant, cls: "bg-red-100 text-red-800 border-red-200" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.count}</p>
            <p className="text-sm font-semibold mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Staff without compliance records */}
      {staffWithoutRecords.length > 0 && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-900 mb-2">⚠ {staffWithoutRecords.length} staff member{staffWithoutRecords.length > 1 ? "s" : ""} have no compliance record</p>
          <div className="flex flex-wrap gap-2">
            {staffWithoutRecords.map((s) => (
              <Link
                key={s.id}
                href={`/compliance/personnel/new?staff_id=${s.id}`}
                className="text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-amber-800 hover:bg-amber-100"
              >
                {s.first_name} {s.last_name} — {s.role || "Staff"} →
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Personnel table */}
      {records.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-4xl mb-4">👥</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No compliance records yet</h3>
          <p className="text-slate-500 mb-4">Add personnel records to start tracking WAC 246-335 compliance.</p>
          <Link href="/compliance/personnel/new" className="inline-block px-6 py-2.5 rounded-lg text-white font-bold text-sm" style={{ backgroundColor: WA_COLORS.navy }}>
            + Add First Record
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: WA_COLORS.navy }} className="text-white">
                  <th className="p-3 text-left font-semibold">Name / Position</th>
                  <th className="p-3 text-left font-semibold">File Complete</th>
                  <th className="p-3 text-left font-semibold">BG Check Due</th>
                  <th className="p-3 text-left font-semibold">TB Due</th>
                  <th className="p-3 text-left font-semibold">Training Due</th>
                  <th className="p-3 text-left font-semibold">Overall</th>
                  <th className="p-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((person, i) => {
                  const score = fileCompletenessScore(person);
                  return (
                    <tr key={person.id} className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                      <td className="p-3">
                        <p className="font-semibold text-slate-900">{person.employee_name}</p>
                        <p className="text-xs text-slate-500">{person.position}</p>
                        {person.hire_date && <p className="text-xs text-slate-400">Hired {formatDate(person.hire_date)}</p>}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: `${score}%`,
                                backgroundColor: score >= 90 ? WA_COLORS.compliant : score >= 70 ? WA_COLORS.atRisk : WA_COLORS.nonCompliant,
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-700">{score}%</span>
                        </div>
                        {person.missing_documents?.length > 0 && (
                          <p className="text-xs text-red-600 mt-0.5">{person.missing_documents.length} missing</p>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dueDateBadge(person.bg_check_renewal_due, 60)}`}>
                          {dueDateLabel(person.bg_check_renewal_due)}
                        </span>
                        {person.bg_check_renewal_result && (
                          <p className="text-xs text-slate-400 mt-0.5 capitalize">{person.bg_check_renewal_result}</p>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dueDateBadge(person.tb_assessment_annual_due, 30)}`}>
                          {dueDateLabel(person.tb_assessment_annual_due)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dueDateBadge(person.annual_training_due_date, 30)}`}>
                          {dueDateLabel(person.annual_training_due_date)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full border font-bold ${statusBgClass(person.compliance_status)}`}>
                          {statusLabel(person.compliance_status)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/compliance/personnel/${person.id}`}
                          className="text-xs font-semibold hover:underline"
                          style={{ color: WA_COLORS.navy }}
                        >
                          View Profile →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
