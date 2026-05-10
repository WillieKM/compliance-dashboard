import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { daysUntil, formatDate, dueDateBadge, WA_COLORS } from "@/lib/compliance/waComplianceUtils";
import type { PersonnelCompliance } from "@/lib/types/wa-compliance";

export const dynamic = "force-dynamic";

export default async function TbAssessmentsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("personnel_compliance")
    .select("id, employee_name, position, tb_assessment_initial_date, tb_assessment_initial_result, tb_assessment_annual_due, tb_assessment_last_date, tb_assessment_last_result")
    .eq("facility_id", profile.facility_id)
    .order("tb_assessment_annual_due", { ascending: true });

  const records = (data ?? []) as Partial<PersonnelCompliance>[];
  const today = new Date().toISOString().split("T")[0];

  const overdue  = records.filter((r) => r.tb_assessment_annual_due && r.tb_assessment_annual_due < today);
  const due30    = records.filter((r) => { const d = daysUntil(r.tb_assessment_annual_due ?? null); return d !== null && d >= 0 && d <= 30; });
  const current  = records.filter((r) => { const d = daysUntil(r.tb_assessment_annual_due ?? null); return d !== null && d > 30; });
  const positive = records.filter((r) => r.tb_assessment_last_result === "positive" || r.tb_assessment_initial_result === "positive");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: WA_COLORS.navy }}>TB Assessment Tracker</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          WAC 246-335-083 · Initial assessment upon hire · Annual reassessment required
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Overdue",      count: overdue.length,  cls: "bg-red-50 border-red-200 text-red-800" },
          { label: "Due ≤ 30 Days",count: due30.length,    cls: "bg-amber-50 border-amber-200 text-amber-800" },
          { label: "Current",      count: current.length,  cls: "bg-emerald-50 border-emerald-200 text-emerald-800" },
          { label: "Positive Results", count: positive.length, cls: "bg-orange-50 border-orange-200 text-orange-800" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.count}</p>
            <p className="text-xs font-semibold mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* WAC info */}
      <div className="rounded-xl p-4 text-sm" style={{ borderLeft: `4px solid ${WA_COLORS.gold}`, backgroundColor: WA_COLORS.navy + "08" }}>
        <p className="font-bold" style={{ color: WA_COLORS.navy }}>WAC 246-335-083 Requirements</p>
        <ul className="mt-2 space-y-1 text-slate-600">
          <li>• <strong>Initial:</strong> TB risk assessment required upon hire using DOH Adult TB Risk Assessment form</li>
          <li>• <strong>Annual:</strong> Risk reassessment required every 12 months</li>
          <li>• <strong>Positive results:</strong> Require follow-up testing and medical evaluation — consult DOH TB Program</li>
          <li>• <strong>Documentation:</strong> Retain all assessment forms and results in personnel file</li>
          <li>• <strong>Form:</strong> Use WA DOH Adult TB Risk Assessment form (available at doh.wa.gov)</li>
        </ul>
      </div>

      {/* Positive results alert */}
      {positive.length > 0 && (
        <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
          <h3 className="font-bold text-orange-900 mb-2">⚠ Staff with Positive TB Results ({positive.length})</h3>
          <p className="text-sm text-orange-800 mb-2">These staff members require follow-up medical evaluation and symptom monitoring.</p>
          {positive.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm text-orange-900 py-1 border-b border-orange-200 last:border-0">
              <span className="font-medium">{p.employee_name} — {p.position}</span>
              <Link href={`/compliance/personnel/${p.id}`} className="font-bold underline">View file →</Link>
            </div>
          ))}
        </div>
      )}

      {/* All records table */}
      {records.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ backgroundColor: WA_COLORS.navy }}>
            <h2 className="font-bold text-white">All TB Assessment Records</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-600">Employee</th>
                <th className="p-3 text-left font-semibold text-slate-600">Initial Assessment</th>
                <th className="p-3 text-left font-semibold text-slate-600">Initial Result</th>
                <th className="p-3 text-left font-semibold text-slate-600">Last Assessment</th>
                <th className="p-3 text-left font-semibold text-slate-600">Last Result</th>
                <th className="p-3 text-left font-semibold text-slate-600">Annual Due</th>
                <th className="p-3 text-right font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((person, i) => (
                <tr key={person.id} className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                  <td className="p-3">
                    <p className="font-semibold text-slate-900">{person.employee_name}</p>
                    <p className="text-xs text-slate-500">{person.position}</p>
                  </td>
                  <td className="p-3 text-slate-700">{formatDate(person.tb_assessment_initial_date ?? null)}</td>
                  <td className="p-3">
                    <ResultBadge result={person.tb_assessment_initial_result ?? null} />
                  </td>
                  <td className="p-3 text-slate-700">{formatDate(person.tb_assessment_last_date ?? null)}</td>
                  <td className="p-3">
                    <ResultBadge result={person.tb_assessment_last_result ?? null} />
                  </td>
                  <td className="p-3">
                    <p className="text-slate-900">{formatDate(person.tb_assessment_annual_due ?? null)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block ${dueDateBadge(person.tb_assessment_annual_due ?? null, 30)}`}>
                      {daysUntil(person.tb_assessment_annual_due ?? null) !== null
                        ? daysUntil(person.tb_assessment_annual_due ?? null)! < 0
                          ? `${Math.abs(daysUntil(person.tb_assessment_annual_due ?? null)!)}d overdue`
                          : `${daysUntil(person.tb_assessment_annual_due ?? null)}d`
                        : "—"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Link href={`/compliance/personnel/${person.id}`} className="text-xs font-semibold hover:underline" style={{ color: WA_COLORS.navy }}>
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-4xl mb-4">🫁</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No TB assessment records yet</h3>
          <p className="text-slate-500 mb-4">Add personnel compliance records to begin tracking TB assessments.</p>
          <Link href="/compliance/personnel/new" className="inline-block px-6 py-2.5 rounded-lg text-white font-bold text-sm" style={{ backgroundColor: WA_COLORS.navy }}>
            Add Personnel Record
          </Link>
        </div>
      )}
    </div>
  );
}

function ResultBadge({ result }: { result: string | null }) {
  if (!result) return <span className="text-xs text-slate-400">—</span>;
  const cls =
    result === "negative"   ? "bg-emerald-100 text-emerald-700" :
    result === "positive"   ? "bg-red-100 text-red-700" :
    result === "not_tested" ? "bg-slate-100 text-slate-600" :
                              "bg-amber-100 text-amber-700";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${cls}`}>
      {result.replace("_", " ")}
    </span>
  );
}
