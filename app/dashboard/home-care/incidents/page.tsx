import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/compliance/waComplianceUtils";

export const dynamic = "force-dynamic";
const navy = "#1a3a52";

const TYPE_LABEL: Record<string, string> = {
  fall: "Fall", injury: "Injury", medication_error: "Medication Error",
  behavioral: "Behavioral", elopement: "Elopement", other: "Other",
};

export default async function HomeCareIncidentsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: incidents } = await supabase
    .from("home_care_incidents").select("*")
    .eq("facility_id", profile.facility_id)
    .order("incident_date", { ascending: false });

  const all       = incidents ?? [];
  const withInjury = all.filter(i => i.injury_sustained);
  const dohRequired = all.filter(i => i.doh_report_required);
  const thisYear  = all.filter(i => i.incident_date?.startsWith(new Date().getFullYear().toString()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href="/dashboard/home-care" className="text-sm hover:underline" style={{ color: navy }}>← Home Care</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Incident Log</h1>
          <p className="text-slate-500 text-sm mt-0.5">WAC 246-335-065 · Document all incidents · DOH notification when required</p>
        </div>
        <Link href="/dashboard/home-care/incidents/new"
          className="px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90"
          style={{ backgroundColor: navy }}>
          + Log Incident
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Incidents This Year", count: thisYear.length,    cls: "bg-white border-slate-200 text-slate-700" },
          { label: "With Injury",         count: withInjury.length,  cls: withInjury.length  > 0 ? "bg-red-50 border-red-200 text-red-800"     : "bg-slate-50 border-slate-200 text-slate-600" },
          { label: "DOH Report Required", count: dohRequired.length, cls: dohRequired.length > 0 ? "bg-red-50 border-red-200 text-red-800"     : "bg-emerald-50 border-emerald-200 text-emerald-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.count}</p>
            <p className="text-xs font-semibold mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {dohRequired.length > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-900 mb-2">🚨 DOH Notification Required</p>
          {dohRequired.map(i => (
            <p key={i.id} className="text-sm text-red-800">• {i.resident_name || "Unknown"} — {formatDate(i.incident_date)} — {TYPE_LABEL[i.incident_type] ?? i.incident_type}</p>
          ))}
        </div>
      )}

      {all.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">📋</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No incidents on file</h3>
          <p className="text-slate-500 mb-4">WAC 246-335-065 requires documenting all incidents including falls, injuries, and medication errors.</p>
          <Link href="/dashboard/home-care/incidents/new"
            className="inline-block px-6 py-2.5 rounded-lg text-white font-bold text-sm hover:opacity-90"
            style={{ backgroundColor: navy }}>
            Log First Incident
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ backgroundColor: navy }}>
            <h2 className="font-bold text-white">All Incidents ({all.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-600">Date</th>
                <th className="p-3 text-left font-semibold text-slate-600">Client</th>
                <th className="p-3 text-left font-semibold text-slate-600">Type</th>
                <th className="p-3 text-left font-semibold text-slate-600">Injury</th>
                <th className="p-3 text-left font-semibold text-slate-600">DOH</th>
                <th className="p-3 text-left font-semibold text-slate-600">Reported By</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {all.map((i, idx) => (
                <tr key={i.id} className={`border-b hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                  <td className="p-3 text-slate-600">{formatDate(i.incident_date)}</td>
                  <td className="p-3 font-semibold text-slate-900">{i.resident_name || "—"}</td>
                  <td className="p-3">
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                      {TYPE_LABEL[i.incident_type] ?? i.incident_type}
                    </span>
                  </td>
                  <td className="p-3">
                    {i.injury_sustained
                      ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Yes</span>
                      : <span className="text-xs text-slate-400">No</span>}
                  </td>
                  <td className="p-3">
                    {i.doh_report_required
                      ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Required</span>
                      : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="p-3 text-slate-500">{i.reported_by || "—"}</td>
                  <td className="p-3">
                    <Link href={`/dashboard/home-care/incidents/${i.id}`}
                      className="text-xs font-semibold hover:underline whitespace-nowrap"
                      style={{ color: navy }}>
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
