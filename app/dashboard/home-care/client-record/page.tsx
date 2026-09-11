import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient as adminClient } from "@supabase/supabase-js";
import PrintButton from "@/app/dashboard/_components/PrintButton";

export const dynamic = "force-dynamic";
const navy = "#1a3a52";

function admin() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const TYPE_LABEL: Record<string, string> = {
  fall: "Fall", injury: "Injury", medication_error: "Medication Error",
  behavioral: "Behavioral", elopement: "Elopement", other: "Other",
};

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(s: string | null | undefined) {
  if (!s) return "";
  return new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default async function ClientRecordPage({
  searchParams,
}: {
  searchParams?: { name?: string };
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const clientName = searchParams?.name ?? "";
  if (!clientName) redirect("/dashboard/home-care/notes-review");

  // Fetch notes and formal incidents in parallel
  const [visitsRes, incidentsRes] = await Promise.all([
    admin()
      .from("care_visits")
      .select(`
        id, caregiver_name, client_name, clock_in_time, clock_out_time, duration_minutes,
        visit_service_reports (
          id, caregiver_notes, mood_demeanor, behavior_changes,
          fall_occurred, incident_occurred, incident_description,
          submitted_at, cleared, cleared_by, cleared_at, supervisor_notes
        )
      `)
      .eq("facility_id", profile.facility_id)
      .eq("client_name", clientName)
      .order("clock_in_time", { ascending: false })
      .limit(2000),
    admin()
      .from("home_care_incidents")
      .select("*")
      .eq("facility_id", profile.facility_id)
      .eq("resident_name", clientName)
      .order("incident_date", { ascending: false })
      .limit(200),
  ]);

  type Report = {
    id: string; caregiver_notes: string | null; mood_demeanor: string | null;
    behavior_changes: string | null; fall_occurred: boolean; incident_occurred: boolean;
    incident_description: string | null; submitted_at: string; cleared: boolean | null;
    cleared_by: string | null; cleared_at: string | null; supervisor_notes: string | null;
  };

  const notes = (visitsRes.data ?? []).flatMap(v => {
    const reports = (v.visit_service_reports as Report[] | null) ?? [];
    return reports.map(r => ({
      type: "note" as const,
      date: v.clock_in_time,
      reportId: r.id, visitId: v.id,
      caregiver: v.caregiver_name,
      clockIn: v.clock_in_time, clockOut: v.clock_out_time,
      duration: v.duration_minutes,
      note: r.caregiver_notes ?? "",
      mood: r.mood_demeanor, behaviors: r.behavior_changes,
      fallFlag: r.fall_occurred, incidentFlag: r.incident_occurred,
      incidentDesc: r.incident_description,
      cleared: r.cleared ?? false, clearedBy: r.cleared_by,
    }));
  });

  const incidents = (incidentsRes.data ?? []).map(i => ({
    type: "incident" as const,
    date: i.incident_date ? i.incident_date + "T12:00:00" : null,
    id: i.id, incidentType: i.incident_type,
    incidentDate: i.incident_date, incidentTime: i.incident_time,
    location: i.location, description: i.description,
    injurySustained: i.injury_sustained, injuryDesc: i.injury_description,
    immediateAction: i.immediate_action,
    physicianNotified: i.physician_notified, familyNotified: i.family_notified,
    dohRequired: i.doh_report_required,
    contributingFactors: i.contributing_factors, preventionPlan: i.prevention_plan,
    reportedBy: i.reported_by,
  }));

  const caregivers = [...new Set(notes.map(n => n.caregiver).filter(Boolean))];
  const openIncidentFlags = notes.filter(n => (n.fallFlag || n.incidentFlag) && !n.cleared).length;
  const dohRequired = incidents.filter(i => i.dohRequired).length;
  const oldest = [...notes.map(n => n.clockIn), ...incidents.map(i => i.date)]
    .filter(Boolean).sort()[0];
  const newest = [...notes.map(n => n.clockIn), ...incidents.map(i => i.date)]
    .filter(Boolean).sort().reverse()[0];

  return (
    <div className="max-w-3xl space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #client-record-print, #client-record-print * { visibility: visible; }
          #client-record-print { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
          .hidden.print\\:block { display: block !important; }
        }
      `}</style>

      {/* Header */}
      <div className="print:hidden flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link href="/dashboard/home-care/notes-review" className="text-sm font-semibold hover:underline" style={{ color: navy }}>
            ← Notes Review
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{clientName}</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Complete client record · {notes.length} note{notes.length !== 1 ? "s" : ""} · {incidents.length} incident{incidents.length !== 1 ? "s" : ""}
            {oldest ? ` · ${fmtDate(oldest)} – ${fmtDate(newest)}` : ""}
          </p>
          {caregivers.length > 0 && (
            <p className="text-xs text-slate-400 mt-1">Caregivers: {caregivers.join(", ")}</p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/dashboard/home-care/notes-review?client=${encodeURIComponent(clientName)}&days=all`}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Notes only
          </Link>
          <Link href={`/dashboard/home-care/incidents`}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            All Incidents
          </Link>
          <PrintButton label="🖨️ Print Full Record" />
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Client Record — {clientName}</h1>
        <p className="text-sm text-slate-500">
          Home Care · {fmtDate(oldest)} – {fmtDate(newest)} · {notes.length} notes · {incidents.length} incidents
        </p>
        <p className="text-sm text-slate-500">Caregivers: {caregivers.join(", ")}</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:hidden">
        {[
          { label: "Care Notes",         value: notes.length,          cls: "bg-white border-slate-200 text-slate-900" },
          { label: "Caregivers",          value: caregivers.length,      cls: "bg-white border-slate-200 text-slate-900" },
          { label: "Open Incident Flags", value: openIncidentFlags,      cls: openIncidentFlags > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-white border-slate-200 text-slate-700" },
          { label: "DOH Reports",         value: dohRequired,            cls: dohRequired > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs font-semibold uppercase tracking-wide mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Alert banners */}
      {openIncidentFlags > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 px-5 py-3">
          <p className="font-bold text-red-900">⚠ {openIncidentFlags} incident flag{openIncidentFlags !== 1 ? "s" : ""} in visit notes awaiting supervisor clearance</p>
          <Link href={`/dashboard/home-care/notes-review?client=${encodeURIComponent(clientName)}&days=all`}
            className="text-sm font-semibold text-red-700 hover:underline">Review notes →</Link>
        </div>
      )}
      {dohRequired > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 px-5 py-3">
          <p className="font-bold text-red-900">🚨 {dohRequired} formal incident{dohRequired !== 1 ? "s" : ""} require DOH notification (WAC 246-335-025)</p>
        </div>
      )}

      <div id="client-record-print" className="space-y-6">

        {/* Formal incidents section */}
        {incidents.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 text-white font-bold flex items-center justify-between"
              style={{ backgroundColor: navy }}>
              <span>Formal Incident Reports ({incidents.length})</span>
              <Link href="/dashboard/home-care/incidents/new"
                className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg font-semibold print:hidden">
                + Log Incident
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {incidents.map(inc => (
                <div key={inc.id} className="p-4">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">
                          {TYPE_LABEL[inc.incidentType] ?? inc.incidentType}
                        </span>
                        {inc.dohRequired && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">DOH Required</span>}
                        {inc.injurySustained && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">Injury</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {fmtDate(inc.incidentDate)}{inc.incidentTime ? ` at ${inc.incidentTime}` : ""}
                        {inc.location ? ` · ${inc.location}` : ""}
                        {inc.reportedBy ? ` · Reported by: ${inc.reportedBy}` : ""}
                      </p>
                    </div>
                    <Link href={`/dashboard/home-care/incidents/${inc.id}`}
                      className="text-xs font-semibold hover:underline print:hidden" style={{ color: navy }}>
                      Full report →
                    </Link>
                  </div>
                  {inc.description && (
                    <div className="mt-2 bg-slate-50 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">
                      {inc.description}
                    </div>
                  )}
                  {inc.injuryDesc && (
                    <div className="mt-1 bg-red-50 rounded-lg p-2 text-xs text-red-800">
                      Injury: {inc.injuryDesc}
                    </div>
                  )}
                  {inc.preventionPlan && (
                    <div className="mt-1 bg-emerald-50 rounded-lg p-2 text-xs text-emerald-800">
                      Prevention: {inc.preventionPlan}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {incidents.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-700">No formal incidents on file for this client</p>
              <p className="text-xs text-slate-400 mt-0.5">WAC 246-335-065 — log all falls, injuries, and medication errors</p>
            </div>
            <Link href="/dashboard/home-care/incidents/new"
              className="text-xs font-semibold px-3 py-2 rounded-lg text-white hover:opacity-90 print:hidden"
              style={{ backgroundColor: navy }}>
              Log Incident
            </Link>
          </div>
        )}

        {/* Care notes section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-800">Care Notes ({notes.length})</h2>
            <span className="text-xs text-slate-400">{caregivers.length} caregiver{caregivers.length !== 1 ? "s" : ""}</span>
          </div>
          {notes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <p className="text-slate-400">No visit notes found for this client.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((n, i) => (
                <div key={`${n.visitId}-${n.reportId}-${i}`}
                  className={`bg-white rounded-2xl border p-4 shadow-sm ${
                    n.fallFlag || n.incidentFlag
                      ? "border-red-200"
                      : n.cleared ? "border-slate-100 opacity-70" : "border-slate-200"
                  }`}>
                  <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">👤 {n.caregiver}</span>
                        {n.fallFlag     && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Fall</span>}
                        {n.incidentFlag && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">Incident</span>}
                        {n.cleared      && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✓ Signed off</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {fmtDate(n.clockIn)} · {fmtTime(n.clockIn)} – {fmtTime(n.clockOut)}
                        {n.duration ? ` (${Math.floor(n.duration / 60)}h ${n.duration % 60}m)` : ""}
                      </p>
                    </div>
                    <Link href={`/dashboard/home-care/visits/${n.visitId}`}
                      className="text-xs font-semibold hover:underline print:hidden" style={{ color: navy }}>
                      Full report →
                    </Link>
                  </div>
                  {n.incidentDesc && (
                    <div className="mb-2 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-800">
                      {n.incidentDesc}
                    </div>
                  )}
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{n.note}</p>
                  </div>
                  {(n.mood || n.behaviors) && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {n.mood && (
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-xs text-slate-400 font-semibold uppercase">Mood</p>
                          <p className="text-xs text-slate-700 mt-0.5">{n.mood}</p>
                        </div>
                      )}
                      {n.behaviors && (
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-xs text-slate-400 font-semibold uppercase">Behavior</p>
                          <p className="text-xs text-slate-700 mt-0.5">{n.behaviors}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
