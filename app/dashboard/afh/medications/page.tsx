import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const amber = "#b45309";

export default async function MARPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const fid = profile.facility_id;

  const { data: meds } = await supabase
    .from("medication_records")
    .select("*, residents(first_name, last_name)")
    .eq("facility_id", fid)
    .order("resident_name")
    .order("medication_name");

  const active       = meds?.filter(m => m.status === "active") ?? [];
  const controlled   = active.filter(m => m.is_controlled);
  const discontinued = meds?.filter(m => m.status === "discontinued") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href="/dashboard/afh" className="text-sm hover:underline" style={{ color: amber }}>← AFH Dashboard</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Medication Administration Records</h1>
          <p className="text-slate-500 text-sm mt-0.5">WAC 388-76-10520 / 10530 / 10540 · Active medications and controlled substance log</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard/afh/medications/destruction"
            className="px-4 py-2 rounded-lg text-sm font-bold border hover:bg-amber-50"
            style={{ borderColor: amber, color: amber }}>
            🗑️ Destruction Log
          </Link>
          <Link href="/dashboard/afh/medications/completion"
            className="px-4 py-2 rounded-lg text-sm font-bold border hover:bg-amber-50"
            style={{ borderColor: amber, color: amber }}>
            📊 Completion Rate
          </Link>
          <Link href="/dashboard/afh/medications/new"
            className="px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90"
            style={{ backgroundColor: amber }}>
            + Add Medication
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active Medications",    count: active.length,       cls: "bg-amber-50 border-amber-200 text-amber-800" },
          { label: "Controlled Substances", count: controlled.length,   cls: controlled.length > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-slate-50 border-slate-200 text-slate-600" },
          { label: "Discontinued",          count: discontinued.length, cls: "bg-slate-50 border-slate-200 text-slate-500" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.count}</p>
            <p className="text-xs font-semibold mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Controlled substance alert */}
      {controlled.length > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-900 mb-2">⚠ {controlled.length} Controlled Substance{controlled.length > 1 ? "s" : ""} — Reconciliation Required</p>
          <p className="text-sm text-red-700">WAC 388-76-10540 requires controlled substance count and reconciliation. Ensure log is up to date.</p>
          <div className="mt-2 space-y-1">
            {controlled.map(m => (
              <p key={m.id} className="text-sm text-red-800">• {m.resident_name} — {m.medication_name} ({m.dosage})</p>
            ))}
          </div>
        </div>
      )}

      {/* Active medications table */}
      {active.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">💊</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No medications on file</h3>
          <p className="text-slate-500 mb-4">Add resident medications to track administration per WAC 388-76-10530.</p>
          <Link href="/dashboard/afh/medications/new"
            className="inline-block px-6 py-2.5 rounded-lg text-white font-bold text-sm"
            style={{ backgroundColor: amber }}>
            + Add Medication
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ backgroundColor: amber }}>
            <h2 className="font-bold text-white">Active Medications ({active.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 text-left font-semibold text-slate-600">Resident</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Medication</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Dosage</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Frequency</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Route</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Prescriber</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Flags</th>
                  <th className="p-3 text-right font-semibold text-slate-600">Log</th>
                </tr>
              </thead>
              <tbody>
                {active.map((med, i) => (
                  <tr key={med.id} className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                    <td className="p-3 font-semibold text-slate-900">{med.resident_name}</td>
                    <td className="p-3 text-slate-800">{med.medication_name}</td>
                    <td className="p-3 text-slate-600">{med.dosage || "—"}</td>
                    <td className="p-3 text-slate-600">{med.frequency || "—"}</td>
                    <td className="p-3 text-slate-600 capitalize">{med.route || "—"}</td>
                    <td className="p-3 text-slate-600">{med.prescriber || "—"}</td>
                    <td className="p-3">
                      {med.is_controlled && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Controlled</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Link href={`/dashboard/afh/medications/${med.id}/log`}
                        className="text-xs font-semibold hover:underline"
                        style={{ color: amber }}>
                        Log Admin →
                      </Link>
                    </td>
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
