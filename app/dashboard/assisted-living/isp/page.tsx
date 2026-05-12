import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { formatDate, daysUntil } from "@/lib/compliance/waComplianceUtils";

export const dynamic = "force-dynamic";
const purple = "#6d28d9";

export default async function ISPPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: isps } = await supabase
    .from("isp_records")
    .select("*")
    .eq("facility_id", profile.facility_id)
    .order("next_review_date", { ascending: true });

  const { data: residents } = await supabase
    .from("residents")
    .select("id, first_name, last_name")
    .eq("facility_id", profile.facility_id);

  const all = isps ?? [];
  const today = new Date().toISOString().split("T")[0];

  const overduePending  = all.filter(i => i.status === "pending" && i.isp_due_date && i.isp_due_date < today);
  const overdueReview   = all.filter(i => i.next_review_date && i.next_review_date < today);
  const dueSoon         = all.filter(i => { const d = daysUntil(i.next_review_date); return d !== null && d >= 0 && d <= 30; });
  const current         = all.filter(i => i.status === "current" && (!i.next_review_date || i.next_review_date >= today));
  const residentsWithISP = new Set(all.map(i => i.resident_id));
  const residentsWithout = (residents ?? []).filter(r => !residentsWithISP.has(r.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href="/dashboard/assisted-living" className="text-sm hover:underline" style={{ color: purple }}>← Assisted Living</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Individual Service Plans (ISP)</h1>
          <p className="text-slate-500 text-sm mt-0.5">WAC 388-78A-2170 · Required within 30 days · Annual review</p>
        </div>
        <Link href="/dashboard/assisted-living/isp/new"
          className="px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90"
          style={{ backgroundColor: purple }}>
          + Add ISP
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Current ISPs",     count: current.length,       cls: "bg-emerald-50 border-emerald-200 text-emerald-800" },
          { label: "Pending Creation", count: overduePending.length, cls: overduePending.length > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-slate-50 border-slate-200 text-slate-600" },
          { label: "Review Overdue",   count: overdueReview.length,  cls: overdueReview.length > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-slate-50 border-slate-200 text-slate-600" },
          { label: "Review Due Soon",  count: dueSoon.length,        cls: dueSoon.length > 0 ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-slate-50 border-slate-200 text-slate-600" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.count}</p>
            <p className="text-xs font-semibold mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Critical alerts */}
      {(overduePending.length > 0 || overdueReview.length > 0) && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-900 mb-2">🚨 Immediate Action Required</p>
          {overduePending.map(i => (
            <p key={i.id} className="text-sm text-red-800">• {i.resident_name} — ISP not created (was due {formatDate(i.isp_due_date)})</p>
          ))}
          {overdueReview.map(i => (
            <p key={i.id} className="text-sm text-red-800">• {i.resident_name} — Annual review overdue since {formatDate(i.next_review_date)}</p>
          ))}
        </div>
      )}

      {/* Residents without ISP */}
      {residentsWithout.length > 0 && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-900 mb-2">⚠ {residentsWithout.length} resident{residentsWithout.length > 1 ? "s" : ""} have no ISP on file</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {residentsWithout.map(r => (
              <Link key={r.id} href={`/dashboard/assisted-living/isp/new?resident_id=${r.id}`}
                className="text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-amber-800 hover:bg-amber-100">
                {r.first_name} {r.last_name} → Create ISP
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ISP table */}
      {all.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">📋</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No ISPs on file</h3>
          <p className="text-slate-500 mb-4">WAC 388-78A-2170 requires an ISP within 30 days of admission for every resident.</p>
          <Link href="/dashboard/assisted-living/isp/new"
            className="inline-block px-6 py-2.5 rounded-lg text-white font-bold text-sm"
            style={{ backgroundColor: purple }}>
            Create First ISP
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ backgroundColor: purple }}>
            <h2 className="font-bold text-white">All ISPs ({all.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 text-left font-semibold text-slate-600">Resident</th>
                  <th className="p-3 text-left font-semibold text-slate-600">ISP Created</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Last Review</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Next Review Due</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Signatures</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="p-3 text-right font-semibold text-slate-600">Edit</th>
                </tr>
              </thead>
              <tbody>
                {all.map((isp, i) => {
                  const reviewDays = daysUntil(isp.next_review_date);
                  const reviewCls = !isp.next_review_date ? "text-slate-400" :
                    reviewDays !== null && reviewDays < 0 ? "text-red-600 font-bold" :
                    reviewDays !== null && reviewDays <= 30 ? "text-amber-600 font-semibold" : "text-emerald-600";
                  const statusMap: Record<string, string> = {
                    current: "bg-emerald-100 text-emerald-700",
                    pending: "bg-amber-100 text-amber-700",
                    overdue_review: "bg-red-100 text-red-700",
                    needs_update: "bg-orange-100 text-orange-700",
                  };
                  const statusCls = statusMap[isp.status] ?? "bg-slate-100 text-slate-600";

                  return (
                    <tr key={isp.id} className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                      <td className="p-3 font-semibold text-slate-900">{isp.resident_name}</td>
                      <td className="p-3 text-slate-600">{formatDate(isp.isp_created_date)}</td>
                      <td className="p-3 text-slate-600">{formatDate(isp.last_review_date)}</td>
                      <td className={`p-3 ${reviewCls}`}>{formatDate(isp.next_review_date)}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isp.resident_signed ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {isp.resident_signed ? "✓ Resident" : "○ Resident"}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isp.rep_signed ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {isp.rep_signed ? "✓ Rep" : "○ Rep"}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusCls}`}>
                          {isp.status?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Link href={`/dashboard/assisted-living/isp/${isp.id}`}
                          className="text-xs font-semibold hover:underline" style={{ color: purple }}>
                          View →
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

      <div className="rounded-xl p-4 text-sm bg-purple-50 border border-purple-200">
        <p className="font-bold text-purple-900 mb-1">WAC 388-78A-2170 Requirements</p>
        <ul className="text-purple-800 space-y-0.5">
          <li>• ISP must be completed within <strong>30 days</strong> of admission</li>
          <li>• Reviewed and updated at least <strong>annually</strong></li>
          <li>• Updated whenever resident's needs or condition changes significantly</li>
          <li>• Resident and/or legal representative must sign the ISP</li>
        </ul>
      </div>
    </div>
  );
}
