import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { daysUntil, formatDate, dueDateBadge, WA_COLORS } from "@/lib/compliance/waComplianceUtils";
import type { PersonnelCompliance } from "@/lib/types/wa-compliance";

export const dynamic = "force-dynamic";

export default async function BackgroundChecksPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("personnel_compliance")
    .select("id, employee_name, position, hire_date, bg_check_initial_date, bg_check_initial_result, bg_check_renewal_due, bg_check_renewal_date, bg_check_renewal_result")
    .eq("facility_id", profile.facility_id)
    .order("bg_check_renewal_due", { ascending: true });

  const records = (data ?? []) as Partial<PersonnelCompliance>[];
  const today = new Date().toISOString().split("T")[0];

  const overdue   = records.filter((r) => r.bg_check_renewal_due && r.bg_check_renewal_due < today);
  const due14     = records.filter((r) => { const d = daysUntil(r.bg_check_renewal_due ?? null); return d !== null && d >= 0 && d <= 14; });
  const due30     = records.filter((r) => { const d = daysUntil(r.bg_check_renewal_due ?? null); return d !== null && d > 14 && d <= 30; });
  const due60     = records.filter((r) => { const d = daysUntil(r.bg_check_renewal_due ?? null); return d !== null && d > 30 && d <= 60; });
  const current   = records.filter((r) => { const d = daysUntil(r.bg_check_renewal_due ?? null); return d !== null && d > 60; });

  const groups = [
    { label: "🔴 Overdue",            items: overdue, headerCls: "bg-red-700" },
    { label: "🟠 Due Within 14 Days", items: due14,   headerCls: "bg-orange-600" },
    { label: "🟡 Due Within 30 Days", items: due30,   headerCls: "bg-amber-500" },
    { label: "🟡 Due Within 60 Days", items: due60,   headerCls: "bg-yellow-500" },
    { label: "🟢 Current",            items: current, headerCls: "bg-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: WA_COLORS.navy }}>Background Check Tracker</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          WAC 246-335-085 · Initial via DSHS BCCU · Renewals every 2 years via WSP
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Overdue",         count: overdue.length,            cls: "bg-red-50 border-red-200 text-red-800" },
          { label: "Due ≤ 14 Days",  count: due14.length,              cls: "bg-orange-50 border-orange-200 text-orange-800" },
          { label: "Due ≤ 30 Days",  count: due30.length + due14.length, cls: "bg-amber-50 border-amber-200 text-amber-800" },
          { label: "Current",         count: current.length,            cls: "bg-emerald-50 border-emerald-200 text-emerald-800" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.count}</p>
            <p className="text-xs font-semibold mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* WAC Info box */}
      <div className="rounded-xl p-4 text-sm" style={{ borderLeft: `4px solid ${WA_COLORS.gold}`, backgroundColor: WA_COLORS.navy + "08" }}>
        <p className="font-bold" style={{ color: WA_COLORS.navy }}>WAC 246-335-085 Requirements</p>
        <ul className="mt-2 space-y-1 text-slate-600">
          <li>• <strong>Initial:</strong> Background check required before unsupervised client contact — processed through DSHS Background Check Central Unit (BCCU)</li>
          <li>• <strong>Renewal:</strong> Required every 2 years — processed through Washington State Patrol (WSP)</li>
          <li>• <strong>Results:</strong> Agency must retain results documentation</li>
          <li>• <strong>Disqualifying:</strong> Convictions affecting client safety require immediate review</li>
        </ul>
      </div>

      {/* Grouped by urgency */}
      {groups.map((group) => (
        group.items.length > 0 && (
          <div key={group.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={`px-5 py-3 ${group.headerCls} text-white`}>
              <h3 className="font-bold text-sm">{group.label} ({group.items.length})</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 text-left font-semibold text-slate-600">Employee</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Initial Check</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Renewal Due</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Last Renewal</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Result</th>
                  <th className="p-3 text-right font-semibold text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((person) => (
                  <tr key={person.id} className="border-b hover:bg-slate-50">
                    <td className="p-3">
                      <p className="font-semibold text-slate-900">{person.employee_name}</p>
                      <p className="text-xs text-slate-500">{person.position}</p>
                    </td>
                    <td className="p-3">
                      <p className="text-slate-700">{formatDate(person.bg_check_initial_date ?? null)}</p>
                      {person.bg_check_initial_result && (
                        <span className={`text-xs capitalize ${person.bg_check_initial_result === "clear" ? "text-emerald-600" : "text-red-600"}`}>
                          {person.bg_check_initial_result}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <p className="text-slate-900">{formatDate(person.bg_check_renewal_due ?? null)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block ${dueDateBadge(person.bg_check_renewal_due ?? null, 60)}`}>
                        {daysUntil(person.bg_check_renewal_due ?? null) !== null
                          ? daysUntil(person.bg_check_renewal_due ?? null)! < 0
                            ? `${Math.abs(daysUntil(person.bg_check_renewal_due ?? null)!)}d overdue`
                            : `${daysUntil(person.bg_check_renewal_due ?? null)}d left`
                          : "—"}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700">
                      {formatDate(person.bg_check_renewal_date ?? null)}
                    </td>
                    <td className="p-3">
                      {person.bg_check_renewal_result ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                          person.bg_check_renewal_result === "clear" ? "bg-emerald-100 text-emerald-700" :
                          person.bg_check_renewal_result === "pending" ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {person.bg_check_renewal_result}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
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
        )
      ))}

      {records.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-4xl mb-4">🔍</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No background check records yet</h3>
          <p className="text-slate-500 mb-4">Add personnel compliance records to begin tracking background checks.</p>
          <Link href="/compliance/personnel/new" className="inline-block px-6 py-2.5 rounded-lg text-white font-bold text-sm" style={{ backgroundColor: WA_COLORS.navy }}>
            Add Personnel Record
          </Link>
        </div>
      )}
    </div>
  );
}
