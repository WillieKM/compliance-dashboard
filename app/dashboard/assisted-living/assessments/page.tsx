import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { formatDate, daysUntil } from "@/lib/compliance/waComplianceUtils";

export const dynamic = "force-dynamic";
const purple = "#6d28d9";

export default async function ALAssessmentsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const [{ data: assessments }, { data: residents }] = await Promise.all([
    supabase.from("resident_assessments_al").select("*").eq("facility_id", profile.facility_id).order("assessment_due_date"),
    supabase.from("residents").select("id, first_name, last_name").eq("facility_id", profile.facility_id),
  ]);

  const all = assessments ?? [];
  const today = new Date().toISOString().split("T")[0];
  const overdue   = all.filter(a => a.assessment_due_date && a.assessment_due_date < today && !a.assessment_date);
  const dueSoon   = all.filter(a => { const d = daysUntil(a.next_assessment_date); return d !== null && d >= 0 && d <= 30; });
  const completed = all.filter(a => a.assessment_date);
  const withAssessment = new Set(all.map(a => a.resident_id));
  const residentsWithout = (residents ?? []).filter(r => !withAssessment.has(r.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href="/dashboard/assisted-living" className="text-sm hover:underline" style={{ color: purple }}>← Assisted Living</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Resident Assessments</h1>
          <p className="text-slate-500 text-sm mt-0.5">WAC 388-78A-2160 · Required within 14 days of admission · Annual reassessment</p>
        </div>
        <Link href="/dashboard/assisted-living/assessments/new"
          className="px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90"
          style={{ backgroundColor: purple }}>
          + Add Assessment
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Completed",       count: completed.length,  cls: "bg-emerald-50 border-emerald-200 text-emerald-800" },
          { label: "Overdue",         count: overdue.length,    cls: overdue.length > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-slate-50 border-slate-200 text-slate-600" },
          { label: "Annual Due Soon", count: dueSoon.length,    cls: dueSoon.length > 0 ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-slate-50 border-slate-200 text-slate-600" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.count}</p>
            <p className="text-xs font-semibold mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {overdue.length > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-900 mb-2">🚨 Assessments Overdue</p>
          {overdue.map(a => (
            <p key={a.id} className="text-sm text-red-800">• {a.resident_name} — was due {formatDate(a.assessment_due_date)}</p>
          ))}
        </div>
      )}

      {residentsWithout.length > 0 && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-900 mb-2">⚠ {residentsWithout.length} resident{residentsWithout.length > 1 ? "s" : ""} have no assessment on file</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {residentsWithout.map(r => (
              <Link key={r.id} href={`/dashboard/assisted-living/assessments/new?resident_id=${r.id}`}
                className="text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-amber-800 hover:bg-amber-100">
                {r.first_name} {r.last_name} → Assess
              </Link>
            ))}
          </div>
        </div>
      )}

      {all.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">🔍</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No assessments on file</h3>
          <p className="text-slate-500 mb-4">WAC 388-78A-2160 requires resident assessment within 14 days of admission.</p>
          <Link href="/dashboard/assisted-living/assessments/new"
            className="inline-block px-6 py-2.5 rounded-lg text-white font-bold text-sm"
            style={{ backgroundColor: purple }}>
            Add First Assessment
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ backgroundColor: purple }}>
            <h2 className="font-bold text-white">All Assessments ({all.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-600">Resident</th>
                <th className="p-3 text-left font-semibold text-slate-600">Due Date</th>
                <th className="p-3 text-left font-semibold text-slate-600">Assessed</th>
                <th className="p-3 text-left font-semibold text-slate-600">By</th>
                <th className="p-3 text-left font-semibold text-slate-600">Next Annual</th>
                <th className="p-3 text-left font-semibold text-slate-600">Fall Risk</th>
              </tr>
            </thead>
            <tbody>
              {all.map((a, i) => {
                const nextDays = daysUntil(a.next_assessment_date);
                return (
                  <tr key={a.id} className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                    <td className="p-3 font-semibold text-slate-900">{a.resident_name}</td>
                    <td className="p-3 text-slate-600">{formatDate(a.assessment_due_date)}</td>
                    <td className="p-3">
                      {a.assessment_date
                        ? <span className="text-emerald-600 font-medium">✓ {formatDate(a.assessment_date)}</span>
                        : <span className="text-red-500 font-semibold">Not done</span>}
                    </td>
                    <td className="p-3 text-slate-500">{a.assessed_by || "—"}</td>
                    <td className={`p-3 ${nextDays !== null && nextDays < 0 ? "text-red-600 font-bold" : nextDays !== null && nextDays <= 30 ? "text-amber-600" : "text-slate-600"}`}>
                      {formatDate(a.next_assessment_date)}
                    </td>
                    <td className="p-3">
                      {a.fall_risk && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${a.fall_risk === "High" ? "bg-red-100 text-red-700" : a.fall_risk === "Moderate" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                          {a.fall_risk}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
