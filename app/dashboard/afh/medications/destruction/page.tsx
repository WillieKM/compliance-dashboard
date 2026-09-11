import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient as adminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const amber = "#b45309";

function admin() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const reasonLabels: Record<string, string> = {
  expired: "Expired",
  discontinued: "Discontinued",
  death: "Resident Deceased",
  damaged: "Damaged / Contaminated",
  other: "Other",
};

const methodLabels: Record<string, string> = {
  flush: "Flushed",
  waste_bin: "Waste Bin",
  return_pharmacy: "Returned to Pharmacy",
  disposal_box: "DEA Disposal Box",
  other: "Other Method",
};

export default async function MedDestructionLogPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { data: entries } = await admin()
    .from("medication_destruction_log")
    .select("*")
    .eq("facility_id", profile.facility_id)
    .order("destruction_date", { ascending: false })
    .limit(500);

  const now = new Date();
  const thisYear  = now.getFullYear().toString();
  const thisMonth = `${thisYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const yearEntries  = (entries ?? []).filter(e => e.destruction_date?.startsWith(thisYear));
  const monthEntries = (entries ?? []).filter(e => e.destruction_date?.startsWith(thisMonth));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl text-white px-5 py-4" style={{ background: `linear-gradient(135deg, ${amber}, #92400e)` }}>
        <Link href="/dashboard/afh/medications" className="text-white/70 text-sm hover:text-white mb-1 inline-block">
          ← Medications
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Medication Destruction Log</h1>
            <p className="text-white/70 text-sm mt-0.5">WAC 388-76-10530 — two-witness documentation required for every destruction</p>
          </div>
          <Link href="/dashboard/afh/medications/destruction/new"
            className="bg-white text-amber-800 font-bold px-4 py-2 rounded-lg text-sm shrink-0 hover:bg-amber-50">
            + Log Destruction
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Entries",  value: (entries ?? []).length },
          { label: "This Year",      value: yearEntries.length },
          { label: "This Month",     value: monthEntries.length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-3xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs font-semibold uppercase tracking-wide mt-1 text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Compliance note */}
      <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span className="font-bold">WAC 388-76-10530 requirement: </span>
        All medication destruction must be witnessed by at least one other responsible party and documented with name, medication, quantity, method, and date. Inspectors will review this log.
      </div>

      {/* Entries */}
      {(entries ?? []).length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">💊</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No destruction entries yet</h3>
          <p className="text-slate-500 text-sm mb-4">
            Document every medication destruction with two witnesses as required by WAC 388-76-10530.
          </p>
          <Link href="/dashboard/afh/medications/destruction/new"
            className="inline-block text-white px-5 py-2 rounded-lg text-sm font-bold"
            style={{ backgroundColor: amber }}>
            Log First Destruction
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">All Entries ({(entries ?? []).length})</h2>
            <span className="text-xs text-slate-400">Most recent first</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-slate-600 text-xs uppercase tracking-wide">
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Resident</th>
                  <th className="px-4 py-2">Medication</th>
                  <th className="px-4 py-2">Qty</th>
                  <th className="px-4 py-2">Reason</th>
                  <th className="px-4 py-2">Method</th>
                  <th className="px-4 py-2">Staff</th>
                  <th className="px-4 py-2">Witnesses</th>
                  <th className="px-4 py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(entries ?? []).map(e => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{fmtDate(e.destruction_date)}</td>
                    <td className="px-4 py-3 text-slate-700">{e.resident_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{e.medication_name}</p>
                      {e.strength && <p className="text-xs text-slate-400">{e.strength}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{e.quantity_amount}{e.unit ? ` ${e.unit}` : ""}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-medium">
                        {reasonLabels[e.reason] ?? e.reason}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{methodLabels[e.destruction_method] ?? e.destruction_method}</td>
                    <td className="px-4 py-3 text-slate-700 text-xs">{e.staff_name}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <p>{e.witness1_name}</p>
                      {e.witness2_name && <p className="text-slate-400">{e.witness2_name}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-[140px] truncate">{e.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
