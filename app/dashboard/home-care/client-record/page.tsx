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

function toDateKey(iso: string | null | undefined): string {
  if (!iso) return "Unknown Date";
  return iso.slice(0, 10); // "YYYY-MM-DD"
}

function fmtDateKey(key: string) {
  if (key === "Unknown Date") return key;
  const d = new Date(key + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
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
  if (!clientName) redirect("/dashboard/home-care/clients");

  type Report = {
    id: string; caregiver_notes: string | null; mood_demeanor: string | null;
    behavior_changes: string | null; fall_occurred: boolean; incident_occurred: boolean;
    incident_description: string | null; submitted_at: string; cleared: boolean | null;
    cleared_by: string | null;
  };

  const [visitsRes, incidentsRes] = await Promise.all([
    admin()
      .from("care_visits")
      .select(`
        id, caregiver_name, client_name, clock_in_time, clock_out_time, duration_minutes,
        visit_service_reports (
          id, caregiver_notes, mood_demeanor, behavior_changes,
          fall_occurred, incident_occurred, incident_description,
          submitted_at, cleared, cleared_by
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

  // Flatten notes
  const notes = (visitsRes.data ?? []).flatMap(v => {
    const reports = (v.visit_service_reports as Report[] | null) ?? [];
    return reports.map(r => ({
      kind: "note" as const,
      dateKey: toDateKey(v.clock_in_time),
      sortTs: v.clock_in_time ?? "",
      visitId: v.id, reportId: r.id,
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

  // Flatten incidents
  const incidents = (incidentsRes.data ?? []).map(i => ({
    kind: "incident" as const,
    dateKey: toDateKey(i.incident_date),
    sortTs: (i.incident_date ?? "") + "T" + (i.incident_time ?? "00:00:00"),
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

  // Merge and group by date
  const allEvents = [...notes, ...incidents];
  const byDate = new Map<string, typeof allEvents>();
  for (const ev of allEvents) {
    if (!byDate.has(ev.dateKey)) byDate.set(ev.dateKey, []);
    byDate.get(ev.dateKey)!.push(ev);
  }
  // Sort dates descending, sort events within each day descending by time
  const dateGroups = Array.from(byDate.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, evs]) => ({
      key,
      events: evs.sort((a, b) => b.sortTs.localeCompare(a.sortTs)),
    }));

  const caregivers = [...new Set(notes.map(n => n.caregiver).filter(Boolean))];
  const openFlags = notes.filter(n => (n.fallFlag || n.incidentFlag) && !n.cleared).length;
  const dohRequired = incidents.filter(i => i.dohRequired).length;
  const firstDate = dateGroups.length ? fmtDateKey(dateGroups[dateGroups.length - 1].key) : "—";
  const lastDate  = dateGroups.length ? fmtDateKey(dateGroups[0].key) : "—";

  return (
    <div className="max-w-3xl space-y-6">
      <style>{`
        @media print {
          nav, aside, header { display: none !important; }
          body * { visibility: hidden; }
          #cr-print, #cr-print * { visibility: visible; }
          #cr-print { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="no-print flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link href="/dashboard/home-care/clients" className="text-sm font-semibold hover:underline" style={{ color: navy }}>
            ← All Clients
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{clientName}</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {notes.length} note{notes.length !== 1 ? "s" : ""} · {incidents.length} incident{incidents.length !== 1 ? "s" : ""} · {dateGroups.length} day{dateGroups.length !== 1 ? "s" : ""} on record
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {firstDate !== "—" ? `First record: ${firstDate}` : ""}{firstDate !== lastDate ? ` · Last record: ${lastDate}` : ""}
          </p>
          {caregivers.length > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">Caregivers: {caregivers.join(", ")}</p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/dashboard/home-care/incidents/new`}
            className="px-3 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 no-print"
            style={{ backgroundColor: navy }}>
            + Log Incident
          </Link>
          <PrintButton label="🖨️ Print Full Record" />
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Client Record — {clientName}</h1>
        <p className="text-sm text-slate-500">Home Care · WAC 246-335-065 · {firstDate} – {lastDate}</p>
        <p className="text-sm text-slate-500">Caregivers: {caregivers.join(", ")}</p>
        <p className="text-sm text-slate-500">{notes.length} notes · {incidents.length} incidents · {dateGroups.length} days</p>
        <hr className="my-4" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
        {[
          { label: "Days on Record",     value: dateGroups.length,  cls: "bg-white border-slate-200 text-slate-900" },
          { label: "Total Notes",        value: notes.length,       cls: "bg-white border-slate-200 text-slate-900" },
          { label: "Open Flags",         value: openFlags,          cls: openFlags > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-white border-slate-200 text-slate-700" },
          { label: "Formal Incidents",   value: incidents.length,   cls: incidents.length > 0 ? "bg-orange-50 border-orange-200 text-orange-800" : "bg-white border-slate-200 text-slate-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs font-semibold uppercase tracking-wide mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Alert banners */}
      {openFlags > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 px-5 py-3 no-print">
          <p className="font-bold text-red-900">⚠ {openFlags} incident flag{openFlags !== 1 ? "s" : ""} in visit notes awaiting supervisor clearance</p>
        </div>
      )}
      {dohRequired > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 px-5 py-3 no-print">
          <p className="font-bold text-red-900">🚨 {dohRequired} incident{dohRequired !== 1 ? "s" : ""} require DOH notification (WAC 246-335-025)</p>
        </div>
      )}

      {/* Empty state */}
      {dateGroups.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-slate-500 font-semibold">No records found for "{clientName}"</p>
          <p className="text-xs text-slate-400 mt-1">Check spelling — name must match exactly as entered in notes.</p>
          <Link href="/dashboard/home-care/clients" className="mt-4 inline-block text-sm font-semibold hover:underline" style={{ color: navy }}>
            ← Back to client list
          </Link>
        </div>
      )}

      {/* Timeline */}
      <div id="cr-print" className="space-y-6">
        {dateGroups.map(({ key, events }) => (
          <div key={key} className="relative">
            {/* Date header */}
            <div className="sticky top-0 z-10 bg-slate-100 border border-slate-300 rounded-xl px-4 py-2 flex items-center gap-3 mb-3">
              <span className="text-lg">📅</span>
              <span className="font-bold text-slate-900 text-sm">{fmtDateKey(key)}</span>
              <span className="text-xs text-slate-400 ml-auto">
                {events.filter(e => e.kind === "note").length} note{events.filter(e => e.kind === "note").length !== 1 ? "s" : ""}
                {events.filter(e => e.kind === "incident").length > 0 ? ` · ${events.filter(e => e.kind === "incident").length} incident` : ""}
              </span>
            </div>

            <div className="space-y-3 pl-2">
              {events.map((ev, i) => {
                if (ev.kind === "incident") {
                  return (
                    <div key={`inc-${ev.id}-${i}`}
                      className="bg-white rounded-2xl border-2 border-orange-200 p-4 shadow-sm">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Incident</span>
                            <span className="font-semibold text-slate-900 text-sm">{TYPE_LABEL[ev.incidentType] ?? ev.incidentType}</span>
                            {ev.dohRequired    && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">DOH Required</span>}
                            {ev.injurySustained && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Injury</span>}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {ev.incidentTime ? `${ev.incidentTime} · ` : ""}
                            {ev.location ? `${ev.location} · ` : ""}
                            {ev.reportedBy ? `Reported by ${ev.reportedBy}` : ""}
                          </p>
                        </div>
                        <Link href={`/dashboard/home-care/incidents/${ev.id}`}
                          className="text-xs font-semibold hover:underline no-print" style={{ color: navy }}>
                          Full report →
                        </Link>
                      </div>
                      {ev.description && (
                        <div className="mt-2 bg-orange-50 rounded-xl p-3 text-sm text-slate-800 whitespace-pre-wrap">
                          {ev.description}
                        </div>
                      )}
                      {ev.injuryDesc && (
                        <div className="mt-1 bg-red-50 rounded-lg p-2 text-xs text-red-800">Injury: {ev.injuryDesc}</div>
                      )}
                      {ev.immediateAction && (
                        <div className="mt-1 bg-slate-50 rounded-lg p-2 text-xs text-slate-700">
                          <span className="font-semibold">Immediate action: </span>{ev.immediateAction}
                        </div>
                      )}
                      {ev.preventionPlan && (
                        <div className="mt-1 bg-emerald-50 rounded-lg p-2 text-xs text-emerald-800">
                          <span className="font-semibold">Prevention plan: </span>{ev.preventionPlan}
                        </div>
                      )}
                      <div className="flex gap-3 mt-2 text-xs text-slate-400">
                        {ev.physicianNotified && <span>✓ Physician notified</span>}
                        {ev.familyNotified    && <span>✓ Family notified</span>}
                      </div>
                    </div>
                  );
                }

                // Note card
                return (
                  <div key={`note-${ev.visitId}-${ev.reportId}-${i}`}
                    className={`bg-white rounded-2xl border p-4 shadow-sm ${
                      ev.fallFlag || ev.incidentFlag ? "border-red-200" : "border-slate-200"
                    } ${ev.cleared ? "opacity-70" : ""}`}>
                    <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">👤 {ev.caregiver}</span>
                          {ev.fallFlag     && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Fall</span>}
                          {ev.incidentFlag && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">Incident</span>}
                          {ev.cleared      && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✓ Signed off{ev.clearedBy ? ` by ${ev.clearedBy}` : ""}</span>}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {fmtTime(ev.clockIn)}{ev.clockOut ? ` – ${fmtTime(ev.clockOut)}` : ""}
                          {ev.duration ? ` · ${Math.floor(ev.duration / 60)}h ${ev.duration % 60}m` : ""}
                        </p>
                      </div>
                      <Link href={`/dashboard/home-care/visits/${ev.visitId}`}
                        className="text-xs font-semibold hover:underline no-print" style={{ color: navy }}>
                        Full report →
                      </Link>
                    </div>
                    {ev.incidentDesc && (
                      <div className="mb-2 bg-red-50 border border-red-100 rounded-lg p-2 text-xs text-red-800">
                        {ev.incidentDesc}
                      </div>
                    )}
                    {ev.note && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                        <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{ev.note}</p>
                      </div>
                    )}
                    {(ev.mood || ev.behaviors) && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {ev.mood && (
                          <div className="bg-slate-50 rounded-lg p-2">
                            <p className="text-xs text-slate-400 font-semibold uppercase">Mood</p>
                            <p className="text-xs text-slate-700 mt-0.5">{ev.mood}</p>
                          </div>
                        )}
                        {ev.behaviors && (
                          <div className="bg-slate-50 rounded-lg p-2">
                            <p className="text-xs text-slate-400 font-semibold uppercase">Behavior</p>
                            <p className="text-xs text-slate-700 mt-0.5">{ev.behaviors}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
