import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { formatDate, daysUntil } from "@/lib/compliance/waComplianceUtils";

export const dynamic = "force-dynamic";
const amber = "#b45309";

export default async function AFHRNDelegationPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: delegations } = await supabase
    .from("rn_delegations").select("*").eq("facility_id", profile.facility_id).order("expiry_date");

  const all = delegations ?? [];
  const today = new Date().toISOString().split("T")[0];
  const active  = all.filter(d => d.status === "active" && (!d.expiry_date || d.expiry_date >= today));
  const expired = all.filter(d => d.status === "active" && d.expiry_date && d.expiry_date < today);
  const dueSoon = all.filter(d => { const days = daysUntil(d.expiry_date); return days !== null && days >= 0 && days <= 30; });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href="/dashboard/afh" className="text-sm hover:underline" style={{ color: amber }}>← AFH</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">RN Delegation Log</h1>
          <p className="text-slate-500 text-sm mt-0.5">WAC 388-76-10530 · RN must authorize staff to assist with medications</p>
        </div>
        <Link href="/dashboard/afh/rn-delegation/new"
          className="px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90"
          style={{ backgroundColor: amber }}>
          + Add Delegation
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active",       count: active.length,  cls: "bg-emerald-50 border-emerald-200 text-emerald-800" },
          { label: "Expired",      count: expired.length, cls: expired.length > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-slate-50 border-slate-200 text-slate-600" },
          { label: "Expiring Soon",count: dueSoon.length, cls: dueSoon.length > 0 ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-slate-50 border-slate-200 text-slate-600" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.count}</p>
            <p className="text-xs font-semibold mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {expired.length > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-900 mb-2">🚨 Expired Delegations — Staff Cannot Administer Medications</p>
          {expired.map(d => (
            <p key={d.id} className="text-sm text-red-800">• {d.delegate_name} (for {d.resident_name}) — expired {formatDate(d.expiry_date)}</p>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ backgroundColor: amber }}>
          <h2 className="font-bold text-white">All Delegations ({all.length})</h2>
        </div>
        {all.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">👩‍⚕️</p>
            <p className="font-bold text-slate-700 mb-1">No delegations on file</p>
            <p className="text-slate-500 text-sm mb-4">WAC 388-76-10530 requires RN authorization for any staff who assist with medications.</p>
            <Link href="/dashboard/afh/rn-delegation/new" className="inline-block px-6 py-2.5 rounded-lg text-white font-bold text-sm" style={{ backgroundColor: amber }}>Add First Delegation</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-600">Delegating RN</th>
                <th className="p-3 text-left font-semibold text-slate-600">Delegate (Staff)</th>
                <th className="p-3 text-left font-semibold text-slate-600">Resident</th>
                <th className="p-3 text-left font-semibold text-slate-600">Medications</th>
                <th className="p-3 text-left font-semibold text-slate-600">Expiry</th>
                <th className="p-3 text-left font-semibold text-slate-600">Competency</th>
                <th className="p-3 text-left font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {all.map((d, i) => {
                const days = daysUntil(d.expiry_date);
                const expCls = days !== null && days < 0 ? "text-red-600 font-bold" : days !== null && days <= 30 ? "text-amber-600" : "text-slate-600";
                return (
                  <tr key={d.id} className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                    <td className="p-3 text-slate-900"><p className="font-semibold">{d.rn_name}</p><p className="text-xs text-slate-400">{d.rn_license}</p></td>
                    <td className="p-3 font-semibold text-slate-900">{d.delegate_name}</td>
                    <td className="p-3 text-slate-600">{d.resident_name}</td>
                    <td className="p-3 text-slate-500 text-xs max-w-[150px] truncate">{d.medications_delegated || "—"}</td>
                    <td className={`p-3 ${expCls}`}>{formatDate(d.expiry_date)}</td>
                    <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.competency_verified ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{d.competency_verified ? "✓ Verified" : "Pending"}</span></td>
                    <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${d.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{d.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl p-4 text-sm bg-amber-50 border border-amber-200">
        <p className="font-bold text-amber-900 mb-1">WAC 388-76-10530 Requirements</p>
        <ul className="text-amber-800 space-y-0.5">
          <li>• A licensed RN must authorize/delegate medication assistance to each qualified staff member</li>
          <li>• Delegation requires documented competency verification</li>
          <li>• RN must review each delegation periodically</li>
          <li>• Expired delegations mean staff cannot legally assist with medications</li>
        </ul>
      </div>
    </div>
  );
}
