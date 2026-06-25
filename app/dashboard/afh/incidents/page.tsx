import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/compliance/waComplianceUtils";

export const dynamic = "force-dynamic";
const amber = "#b45309";

const TYPE_LABEL: Record<string, string> = {
  fall: "Fall",
  injury: "Injury",
  behavioral: "Behavioral",
  medication_error: "Medication Error",
  elopement: "Elopement",
  other: "Other",
};

export default async function AFHIncidentsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: incidents } = await supabase
    .from("afh_incidents").select("*").eq("facility_id", profile.facility_id).order("incident_date", { ascending: false });

  const all = incidents ?? [];
  const withInjury = all.filter(f => f.injury_sustained);
  const dohRequired = all.filter(f => f.doh_report_required);
  const thisYear = all.filter(f => f.incident_date?.startsWith(new Date().getFullYear().toString()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href="/dashboard/afh" className="text-sm hover:underline" style={{ color: amber }}>← AFH</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Incident Log</h1>
          <p className="text-slate-500 text-sm mt-0.5">WAC 388-76-10350 · 24-hour DOH notification for reportable incidents</p>
        </div>
        <Link href="/dashboard/afh/incidents/new"
          className="px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90"
          style={{ backgroundColor: amber }}>
          + Log Incident
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Incidents This Year", count: thisYear.length,   cls: "bg-white border-slate-200 text-slate-700" },
          { label: "With Injury",         count: withInjury.length,  cls: withInjury.length > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-slate-50 border-slate-200 text-slate-600" },
          { label: "DOH Report Due",      count: dohRequired.length, cls: dohRequired.length > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.count}</p>
            <p className="text-xs font-semibold mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {dohRequired.length > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-900 mb-2">🚨 DOH Reporting Required</p>
          {dohRequired.map(f => <p key={f.id} className="text-sm text-red-800">• {f.resident_name} — {TYPE_LABEL[f.incident_type] ?? f.incident_type} on {formatDate(f.incident_date)}{f.injury_description ? `: ${f.injury_description}` : ""}</p>)}
        </div>
      )}

      {all.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">⚠️</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No incidents recorded</h3>
          <p className="text-slate-500 mb-4">Log all incidents to track patterns and demonstrate compliance with WAC 388-76-10350.</p>
          <Link href="/dashboard/afh/incidents/new" className="inline-block px-6 py-2.5 rounded-lg text-white font-bold text-sm" style={{ backgroundColor: amber }}>Log Incident</Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ backgroundColor: amber }}>
            <h2 className="font-bold text-white">Incident Log ({all.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-600">Date</th>
                <th className="p-3 text-left font-semibold text-slate-600">Type</th>
                <th className="p-3 text-left font-semibold text-slate-600">Resident</th>
                <th className="p-3 text-left font-semibold text-slate-600">Location</th>
                <th className="p-3 text-left font-semibold text-slate-600">Injury</th>
                <th className="p-3 text-left font-semibold text-slate-600">Physician</th>
                <th className="p-3 text-left font-semibold text-slate-600">DOH Report</th>
                <th className="p-3 text-left font-semibold text-slate-600">Reported By</th>
              </tr>
            </thead>
            <tbody>
              {all.map((f, i) => (
                <tr key={f.id} className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                  <td className="p-3 font-semibold text-slate-900">{formatDate(f.incident_date)}<p className="text-xs text-slate-400">{f.incident_time || ""}</p></td>
                  <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">{TYPE_LABEL[f.incident_type] ?? f.incident_type}</span></td>
                  <td className="p-3 text-slate-700">{f.resident_name}</td>
                  <td className="p-3 text-slate-600">{f.location || "—"}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.injury_sustained ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{f.injury_sustained ? `✕ ${f.injury_description || "Yes"}` : "None"}</span></td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${f.physician_notified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{f.physician_notified ? "✓ Notified" : "Pending"}</span></td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${f.doh_report_required ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>{f.doh_report_required ? "Required" : "N/A"}</span></td>
                  <td className="p-3 text-slate-600">{f.reported_by || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
