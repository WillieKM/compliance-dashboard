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

const TYPE_COLOR: Record<string, string> = {
  fall:              "bg-orange-100 text-orange-800",
  injury:            "bg-red-100 text-red-800",
  medication_error:  "bg-purple-100 text-purple-800",
  behavioral:        "bg-blue-100 text-blue-800",
  elopement:         "bg-rose-100 text-rose-800",
  other:             "bg-slate-100 text-slate-700",
};

export default async function HomeCareIncidentsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: incidents } = await supabase
    .from("home_care_incidents").select("*")
    .eq("facility_id", profile.facility_id)
    .order("incident_date", { ascending: false });

  const all        = incidents ?? [];
  const withInjury  = all.filter(i => i.injury_sustained);
  const dohRequired = all.filter(i => i.doh_report_required);
  const thisYear    = all.filter(i => i.incident_date?.startsWith(new Date().getFullYear().toString()));

  // Group by client name, most recently incident first
  const byClient = new Map<string, typeof all>();
  for (const inc of all) {
    const key = inc.resident_name?.trim() || "No Client Assigned";
    if (!byClient.has(key)) byClient.set(key, []);
    byClient.get(key)!.push(inc);
  }
  const clientGroups = Array.from(byClient.entries()).sort((a, b) => {
    const latestA = a[1][0]?.incident_date ?? "";
    const latestB = b[1][0]?.incident_date ?? "";
    return latestB.localeCompare(latestA);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href="/dashboard/home-care" className="text-sm hover:underline" style={{ color: navy }}>← Home Care</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Incident Log</h1>
          <p className="text-slate-500 text-sm mt-0.5">WAC 246-335-065 · Grouped by client · DOH notification when required</p>
        </div>
        <Link href="/dashboard/home-care/incidents/new"
          className="px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90"
          style={{ backgroundColor: navy }}>
          + Log Incident
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Clients with Incidents", count: clientGroups.length,  cls: "bg-white border-slate-200 text-slate-700" },
          { label: "Incidents This Year",    count: thisYear.length,       cls: "bg-white border-slate-200 text-slate-700" },
          { label: "With Injury",            count: withInjury.length,     cls: withInjury.length  > 0 ? "bg-red-50 border-red-200 text-red-800"     : "bg-slate-50 border-slate-200 text-slate-500" },
          { label: "DOH Report Required",    count: dohRequired.length,    cls: dohRequired.length > 0 ? "bg-red-50 border-red-200 text-red-800"     : "bg-emerald-50 border-emerald-200 text-emerald-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.count}</p>
            <p className="text-xs font-semibold mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* DOH alert banner */}
      {dohRequired.length > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-900 mb-2">🚨 DOH Notification Required</p>
          {dohRequired.map(i => (
            <div key={i.id} className="flex items-center justify-between">
              <p className="text-sm text-red-800">
                • {i.resident_name || "Unknown"} — {formatDate(i.incident_date)} — {TYPE_LABEL[i.incident_type] ?? i.incident_type}
              </p>
              <Link href={`/dashboard/home-care/incidents/${i.id}`}
                className="text-xs font-semibold text-red-700 hover:underline ml-4">
                View →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
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
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-800">Incidents by Client ({clientGroups.length} client{clientGroups.length !== 1 ? "s" : ""})</h2>

          {clientGroups.map(([clientName, clientIncs]) => {
            const hasInjury = clientIncs.some(i => i.injury_sustained);
            const hasDoh    = clientIncs.some(i => i.doh_report_required);
            const mostRecent = clientIncs[0]?.incident_date;

            return (
              <div key={clientName} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Client header */}
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg">👤</span>
                    <h3 className="font-bold text-slate-900">{clientName}</h3>
                    <span className="text-xs text-slate-400">
                      {clientIncs.length} incident{clientIncs.length !== 1 ? "s" : ""}
                      {mostRecent ? ` · Most recent: ${formatDate(mostRecent)}` : ""}
                    </span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {hasDoh    && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">DOH Required</span>}
                    {hasInjury && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">Injury</span>}
                  </div>
                </div>

                {/* Incidents table for this client */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Injury</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">DOH</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Reported By</th>
                        <th className="px-4 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientIncs.map((i, idx) => (
                        <tr key={i.id} className={`border-b border-slate-100 hover:bg-blue-50 transition-colors ${idx % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(i.incident_date)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TYPE_COLOR[i.incident_type] ?? "bg-slate-100 text-slate-700"}`}>
                              {TYPE_LABEL[i.incident_type] ?? i.incident_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{i.location || "—"}</td>
                          <td className="px-4 py-3">
                            {i.injury_sustained
                              ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Yes</span>
                              : <span className="text-xs text-slate-300">No</span>}
                          </td>
                          <td className="px-4 py-3">
                            {i.doh_report_required
                              ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Required</span>
                              : <span className="text-xs text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{i.reported_by || "—"}</td>
                          <td className="px-4 py-3">
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
