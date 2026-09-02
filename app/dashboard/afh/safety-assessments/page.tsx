import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { formatDate, daysUntil } from "@/lib/compliance/waComplianceUtils";

export const dynamic = "force-dynamic";
const amber = "#b45309";

const RISK_STYLE: Record<string, string> = {
  low:    "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  high:   "bg-red-100 text-red-800",
};

export default async function AfhSafetyAssessmentsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const [{ data: assessments }, { data: residents }] = await Promise.all([
    supabase.from("afh_safety_assessments").select("*")
      .eq("facility_id", profile.facility_id)
      .order("assessment_date", { ascending: false }),
    supabase.from("residents").select("id, first_name, last_name")
      .eq("facility_id", profile.facility_id),
  ]);

  const all = assessments ?? [];
  const today = new Date().toISOString().split("T")[0];
  const highRisk  = all.filter(a => a.fall_risk === "high");
  const dueSoon   = all.filter(a => { const d = daysUntil(a.next_assessment_date); return d !== null && d >= 0 && d <= 30; });
  const overdue   = all.filter(a => a.next_assessment_date && a.next_assessment_date < today);
  const withAssessment = new Set(all.map(a => a.resident_id));
  const residentsWithout = (residents ?? []).filter(r => !withAssessment.has(r.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href="/dashboard/afh" className="text-sm hover:underline" style={{ color: amber }}>← AFH</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Facility Safety Assessments</h1>
          <p className="text-slate-500 text-sm mt-0.5">WAC 388-76-10820 · Home Safety / Inspections · Annual review</p>
        </div>
        <Link href="/dashboard/afh/safety-assessments/new"
          className="px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90"
          style={{ backgroundColor: amber }}>
          + New Assessment
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Assessments", count: all.length,       cls: "bg-white border-slate-200 text-slate-700" },
          { label: "High Fall Risk",    count: highRisk.length,  cls: highRisk.length  > 0 ? "bg-red-50 border-red-200 text-red-800"    : "bg-slate-50 border-slate-200 text-slate-600" },
          { label: "Review Due Soon",   count: dueSoon.length,   cls: dueSoon.length   > 0 ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-slate-50 border-slate-200 text-slate-600" },
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
            <p key={a.id} className="text-sm text-red-800">• {a.resident_name} — due {formatDate(a.next_assessment_date)}</p>
          ))}
        </div>
      )}

      {residentsWithout.length > 0 && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-900 mb-2">⚠ {residentsWithout.length} resident{residentsWithout.length > 1 ? "s" : ""} have no safety assessment on file</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {residentsWithout.map(r => (
              <Link key={r.id} href={`/dashboard/afh/safety-assessments/new?resident_id=${r.id}`}
                className="text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-amber-800 hover:bg-amber-100">
                {r.first_name} {r.last_name} → Add Assessment
              </Link>
            ))}
          </div>
        </div>
      )}

      {all.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">🏠</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No safety assessments on file</h3>
          <p className="text-slate-500 mb-4">WAC 388-76-10820 requires facility safety inspections to identify hazards, fall risk, and emergency preparedness.</p>
          <Link href="/dashboard/afh/safety-assessments/new"
            className="inline-block px-6 py-2.5 rounded-lg text-white font-bold text-sm hover:opacity-90"
            style={{ backgroundColor: amber }}>
            Add First Assessment
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ backgroundColor: amber }}>
            <h2 className="font-bold text-white">All Assessments ({all.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-600">Resident</th>
                <th className="p-3 text-left font-semibold text-slate-600">Assessment Date</th>
                <th className="p-3 text-left font-semibold text-slate-600">Fall Risk</th>
                <th className="p-3 text-left font-semibold text-slate-600">Assessed By</th>
                <th className="p-3 text-left font-semibold text-slate-600">Next Review</th>
              </tr>
            </thead>
            <tbody>
              {all.map((a, idx) => {
                const reviewDays = daysUntil(a.next_assessment_date);
                return (
                  <tr key={a.id} className={`border-b hover:bg-slate-50 ${idx % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                    <td className="p-3 font-semibold text-slate-900">{a.resident_name || "—"}</td>
                    <td className="p-3 text-slate-600">{formatDate(a.assessment_date)}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${RISK_STYLE[a.fall_risk] ?? "bg-slate-100 text-slate-600"}`}>
                        {a.fall_risk}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">{a.assessed_by || "—"}</td>
                    <td className={`p-3 ${reviewDays !== null && reviewDays < 0 ? "text-red-600 font-bold" : reviewDays !== null && reviewDays <= 30 ? "text-amber-600 font-medium" : "text-slate-600"}`}>
                      {formatDate(a.next_assessment_date) || "—"}
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
