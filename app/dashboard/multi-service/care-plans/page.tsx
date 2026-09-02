import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { formatDate, daysUntil } from "@/lib/compliance/waComplianceUtils";

export const dynamic = "force-dynamic";
const teal = "#0f766e";

export default async function MultiServiceCarePlansPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const [{ data: plans }, { data: residents }] = await Promise.all([
    supabase.from("multi_service_care_plans").select("*").eq("facility_id", profile.facility_id).order("care_plan_due_date"),
    supabase.from("residents").select("id, first_name, last_name").eq("facility_id", profile.facility_id),
  ]);

  const all = plans ?? [];
  const today = new Date().toISOString().split("T")[0];
  const overdue   = all.filter(p => p.care_plan_due_date && p.care_plan_due_date < today && !p.care_plan_date);
  const dueSoon   = all.filter(p => { const d = daysUntil(p.next_review_date); return d !== null && d >= 0 && d <= 30; });
  const completed = all.filter(p => p.care_plan_date);
  const withPlan  = new Set(all.map(p => p.resident_id));
  const clientsWithout = (residents ?? []).filter(r => !withPlan.has(r.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href="/dashboard/multi-service" className="text-sm hover:underline" style={{ color: teal }}>← Multi-Service</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Plans of Care</h1>
          <p className="text-slate-500 text-sm mt-0.5">WAC 388-71-0520 · Required at start of services · Reviewed every 60 days</p>
        </div>
        <Link href="/dashboard/multi-service/care-plans/new"
          className="px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90"
          style={{ backgroundColor: teal }}>
          + Add Plan of Care
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Completed",       count: completed.length, cls: "bg-emerald-50 border-emerald-200 text-emerald-800" },
          { label: "Overdue",         count: overdue.length,   cls: overdue.length > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-slate-50 border-slate-200 text-slate-600" },
          { label: "Review Due Soon", count: dueSoon.length,   cls: dueSoon.length > 0 ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-slate-50 border-slate-200 text-slate-600" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.count}</p>
            <p className="text-xs font-semibold mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {overdue.length > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-900 mb-2">Plans of Care Overdue</p>
          {overdue.map(p => (
            <p key={p.id} className="text-sm text-red-800">• {p.resident_name} — was due {formatDate(p.care_plan_due_date)}</p>
          ))}
        </div>
      )}

      {clientsWithout.length > 0 && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-900 mb-2">⚠ {clientsWithout.length} client{clientsWithout.length > 1 ? "s" : ""} have no plan of care on file</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {clientsWithout.map(r => (
              <Link key={r.id} href={`/dashboard/multi-service/care-plans/new?resident_id=${r.id}`}
                className="text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-amber-800 hover:bg-amber-100">
                {r.first_name} {r.last_name} → Add Plan
              </Link>
            ))}
          </div>
        </div>
      )}

      {all.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">📋</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No plans of care on file</h3>
          <p className="text-slate-500 mb-4">WAC 388-71-0520 requires a plan of care created and signed before or at the start of services.</p>
          <Link href="/dashboard/multi-service/care-plans/new"
            className="inline-block px-6 py-2.5 rounded-lg text-white font-bold text-sm"
            style={{ backgroundColor: teal }}>
            Add First Plan of Care
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ backgroundColor: teal }}>
            <h2 className="font-bold text-white">All Plans of Care ({all.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-600">Client</th>
                <th className="p-3 text-left font-semibold text-slate-600">Services Start</th>
                <th className="p-3 text-left font-semibold text-slate-600">Plan Completed</th>
                <th className="p-3 text-left font-semibold text-slate-600">Prepared By</th>
                <th className="p-3 text-left font-semibold text-slate-600">60-Day Review</th>
              </tr>
            </thead>
            <tbody>
              {all.map((p, i) => {
                const reviewDays = daysUntil(p.next_review_date);
                return (
                  <tr key={p.id} className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                    <td className="p-3 font-semibold text-slate-900">{p.resident_name}</td>
                    <td className="p-3 text-slate-600">{formatDate(p.start_of_services_date)}</td>
                    <td className="p-3">
                      {p.care_plan_date
                        ? <span className="text-emerald-600 font-medium">✓ {formatDate(p.care_plan_date)}</span>
                        : <span className="text-red-500 font-semibold">Not done</span>}
                    </td>
                    <td className="p-3 text-slate-500">{p.prepared_by || "—"}</td>
                    <td className={`p-3 ${reviewDays !== null && reviewDays < 0 ? "text-red-600 font-bold" : reviewDays !== null && reviewDays <= 30 ? "text-amber-600" : "text-slate-600"}`}>
                      {formatDate(p.next_review_date)}
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
