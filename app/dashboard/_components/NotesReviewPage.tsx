import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient as adminClient } from "@supabase/supabase-js";
import IncidentClearButton from "./IncidentClearButton";
import NoteDeleteButton from "./NoteDeleteButton";
import NoteDateEditButton from "./NoteDateEditButton";
import NoteSignOffButton from "./NoteSignOffButton";
import PrintButton from "./PrintButton";

function admin() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const dynamic = "force-dynamic";

interface Props {
  settingSlug: string;
  settingLabel: string;
  backHref: string;
  headerBg: string;
  clientFilter?: string;
  daysFilter?: string;
}

export default async function NotesReviewPage({
  settingSlug, settingLabel, backHref, headerBg, clientFilter, daysFilter,
}: Props) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  // Build query — no hard limit when filtering by client or showing all
  const days = daysFilter ?? "30";
  const baseSlug = settingSlug === "assisted-living" ? "home-care" : settingSlug;

  let query = admin()
    .from("care_visits")
    .select(`
      id,
      caregiver_name,
      client_name,
      clock_in_time,
      clock_out_time,
      duration_minutes,
      visit_service_reports (
        id, caregiver_notes, mood_demeanor, behavior_changes,
        fall_occurred, incident_occurred, incident_description,
        submitted_at, cleared, cleared_by, cleared_at, supervisor_notes
      )
    `)
    .eq("facility_id", profile.facility_id)
    .order("clock_in_time", { ascending: false });

  if (clientFilter) {
    // Per-client view: all notes ever, no limit
    query = (query as any).eq("client_name", clientFilter);
  } else {
    // Date range filter
    if (days !== "all") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(days));
      query = (query as any).gte("clock_in_time", cutoff.toISOString());
    }
    (query as any).limit(days === "all" ? 2000 : 500);
  }

  const { data } = await query.limit(clientFilter ? 2000 : days === "all" ? 2000 : 500);

  type Report = {
    id: string; caregiver_notes: string | null; mood_demeanor: string | null;
    behavior_changes: string | null; fall_occurred: boolean; incident_occurred: boolean;
    incident_description: string | null; submitted_at: string; cleared: boolean | null;
    cleared_by: string | null; cleared_at: string | null; supervisor_notes: string | null;
  };

  const allEntries = (data ?? []).flatMap(v => {
    const reports = (v.visit_service_reports as Report[] | null) ?? [];
    return reports.map(r => ({
      reportId: r.id, visitId: v.id,
      caregiver: v.caregiver_name, client: v.client_name,
      clockIn: v.clock_in_time, clockOut: v.clock_out_time,
      duration: v.duration_minutes,
      note: r.caregiver_notes ?? "",
      mood: r.mood_demeanor, behaviors: r.behavior_changes,
      fallFlag: r.fall_occurred, incidentFlag: r.incident_occurred,
      incidentDesc: r.incident_description, submittedAt: r.submitted_at,
      cleared: r.cleared ?? false, clearedBy: r.cleared_by,
      clearedAt: r.cleared_at, supervisorNotes: r.supervisor_notes,
    }));
  });

  const withFlags      = allEntries.filter(n => (n.fallFlag || n.incidentFlag) && !n.cleared);
  const clearedFlags   = allEntries.filter(n => (n.fallFlag || n.incidentFlag) && n.cleared);
  const regularNotes   = allEntries.filter(n => !n.fallFlag && !n.incidentFlag);

  // Group regular notes by client
  const notesByClient = new Map<string, typeof regularNotes>();
  for (const note of regularNotes) {
    const key = note.client ?? "No Client Assigned";
    if (!notesByClient.has(key)) notesByClient.set(key, []);
    notesByClient.get(key)!.push(note);
  }
  const clientGroups = Array.from(notesByClient.entries()).sort((a, b) => {
    const latestA = Math.max(...a[1].map(n => new Date(n.clockIn ?? 0).getTime()));
    const latestB = Math.max(...b[1].map(n => new Date(n.clockIn ?? 0).getTime()));
    return latestB - latestA;
  });

  const baseUrl = `/dashboard/${settingSlug}/notes-review`;

  function fmtDate(s: string | null) {
    if (!s) return "—";
    return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  function fmtTime(s: string | null) {
    if (!s) return "";
    return new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function NoteCard({ n, showFlag = true }: { n: typeof allEntries[0]; showFlag?: boolean }) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900">👤 {n.caregiver}</span>
              {n.client && !clientFilter && <span className="text-slate-500 text-sm">→ {n.client}</span>}
              {showFlag && n.fallFlag     && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">🩹 Fall</span>}
              {showFlag && n.incidentFlag && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">⚠ Incident</span>}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {fmtDate(n.clockIn)} · {fmtTime(n.clockIn)} – {fmtTime(n.clockOut)}
              {n.duration ? ` (${Math.floor(n.duration / 60)}h ${n.duration % 60}m)` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0 print:hidden">
            <NoteDateEditButton visitId={n.visitId} currentDate={n.clockIn} />
            <NoteDeleteButton reportId={n.reportId} />
            <Link href={`/dashboard/${baseSlug}/visits/${n.visitId}`}
              className="text-xs font-semibold text-blue-600 hover:underline">
              Full Report →
            </Link>
          </div>
        </div>

        {n.incidentDesc && (
          <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            <span className="font-semibold">Incident: </span>{n.incidentDesc}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{n.note}</p>
        </div>

        {(n.mood || n.behaviors) && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            {n.mood && (
              <div className="bg-slate-50 rounded-lg p-2.5">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Mood</p>
                <p className="text-sm text-slate-700 mt-0.5">{n.mood}</p>
              </div>
            )}
            {n.behaviors && (
              <div className="bg-slate-50 rounded-lg p-2.5">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Behavior / Health</p>
                <p className="text-sm text-slate-700 mt-0.5">{n.behaviors}</p>
              </div>
            )}
          </div>
        )}

        <div className="print:hidden">
          {(n.fallFlag || n.incidentFlag) ? (
            <IncidentClearButton reportId={n.reportId} clearedBy={n.clearedBy}
              clearedAt={n.clearedAt} supervisorNotes={n.supervisorNotes} />
          ) : (
            <NoteSignOffButton reportId={n.reportId} clearedBy={n.clearedBy}
              clearedAt={n.clearedAt} supervisorNotes={n.supervisorNotes} />
          )}
        </div>
      </div>
    );
  }

  // ── Per-client full history view ─────────────────────────────────────────────
  if (clientFilter) {
    const caregivers = [...new Set(allEntries.map(n => n.caregiver).filter(Boolean))];
    const oldest = allEntries.length ? fmtDate(allEntries[allEntries.length - 1].clockIn) : "—";
    const newest = allEntries.length ? fmtDate(allEntries[0].clockIn) : "—";

    return (
      <div className="space-y-6">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #notes-print-area, #notes-print-area * { visibility: visible; }
            #notes-print-area { position: absolute; left: 0; top: 0; width: 100%; }
            .print\\:hidden { display: none !important; }
          }
        `}</style>

        {/* Header */}
        <div className="print:hidden flex items-start justify-between flex-wrap gap-4">
          <div>
            <Link href={baseUrl} className="text-sm font-semibold text-slate-500 hover:text-slate-900">← All Clients</Link>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">{clientFilter}</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Complete note history · {allEntries.length} note{allEntries.length !== 1 ? "s" : ""} · {oldest} – {newest}
            </p>
            {caregivers.length > 0 && (
              <p className="text-xs text-slate-400 mt-1">Caregivers: {caregivers.join(", ")}</p>
            )}
          </div>
          <PrintButton label="🖨️ Print / Export PDF" />
        </div>

        {/* Print header (only shows when printing) */}
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold">Care Notes — {clientFilter}</h1>
          <p className="text-sm text-slate-500">{settingLabel} · {oldest} – {newest} · {allEntries.length} notes</p>
          <p className="text-sm text-slate-500">Caregivers: {caregivers.join(", ")}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:hidden">
          {[
            { label: "Total Notes",    value: allEntries.length,     cls: "bg-white border-slate-200 text-slate-900" },
            { label: "Caregivers",     value: caregivers.length,     cls: "bg-white border-slate-200 text-slate-900" },
            { label: "Open Incidents", value: withFlags.length,      cls: withFlags.length > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-white border-slate-200 text-slate-700" },
            { label: "Signed Off",     value: regularNotes.filter(n => n.cleared).length, cls: "bg-emerald-50 border-emerald-200 text-emerald-800" },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="text-xs font-semibold uppercase tracking-wide mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div id="notes-print-area" className="space-y-6">
          {/* Incident flags */}
          {withFlags.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-red-800 mb-3">⚠ Open Incident Reports ({withFlags.length})</h2>
              <div className="space-y-3">{withFlags.map(n => <NoteCard key={`${n.visitId}-${n.reportId}`} n={n} />)}</div>
            </div>
          )}

          {/* All notes */}
          {regularNotes.length === 0 && withFlags.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <p className="text-4xl mb-3">📝</p>
              <p className="text-slate-500">No notes on record for this client.</p>
            </div>
          ) : regularNotes.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-slate-800 mb-3">
                All Notes ({regularNotes.length})
              </h2>
              <div className="space-y-3">
                {regularNotes.map((n, i) => (
                  <div key={`${n.visitId}-${n.reportId}-${i}`} className={n.cleared ? "opacity-60" : ""}>
                    <NoteCard n={n} showFlag={false} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main grouped view ────────────────────────────────────────────────────────
  const DAY_OPTIONS = [
    { label: "7 days",  value: "7" },
    { label: "30 days", value: "30" },
    { label: "90 days", value: "90" },
    { label: "All time",value: "all" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl text-white px-5 py-4" style={{ background: headerBg }}>
        <Link href={backHref} className="text-white/70 text-sm hover:text-white mb-1 inline-block">
          ← {settingLabel} Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Staff Notes Review</h1>
        <p className="text-white/70 text-sm mt-0.5">All caregiver notes, grouped by client</p>
      </div>

      {/* Date range filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-slate-600 mr-1">Show:</span>
        {DAY_OPTIONS.map(opt => (
          <Link key={opt.value}
            href={`${baseUrl}?days=${opt.value}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
              days === opt.value
                ? "text-white border-transparent"
                : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
            style={days === opt.value ? { background: headerBg } : {}}>
            {opt.label}
          </Link>
        ))}
        <span className="text-xs text-slate-400 ml-2">
          {allEntries.length} note{allEntries.length !== 1 ? "s" : ""} loaded
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-slate-900">{clientGroups.length}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Clients</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-slate-900">{allEntries.length}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Total Notes</p>
        </div>
        <div className={`rounded-xl border-2 p-4 text-center ${withFlags.length > 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
          <p className={`text-3xl font-bold ${withFlags.length > 0 ? "text-red-700" : "text-slate-500"}`}>{withFlags.length}</p>
          <p className={`text-xs uppercase tracking-wide mt-1 font-semibold ${withFlags.length > 0 ? "text-red-600" : "text-slate-400"}`}>Pending Incidents</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-slate-900">{new Set(allEntries.map(n => n.caregiver)).size}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Staff Members</p>
        </div>
      </div>

      {/* Pending incident flags */}
      {withFlags.length > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-900 mb-3">⚠ Incidents / Falls Awaiting Supervisor Clearance ({withFlags.length})</p>
          <div className="space-y-3">{withFlags.map(n => <NoteCard key={`${n.visitId}-${n.reportId}`} n={n} />)}</div>
        </div>
      )}

      {/* Cleared incident reports */}
      {clearedFlags.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-3">Cleared Incident Reports ({clearedFlags.length})</h2>
          <div className="space-y-3">
            {clearedFlags.map(n => (
              <div key={`${n.visitId}-${n.reportId}`} className="opacity-80"><NoteCard n={n} /></div>
            ))}
          </div>
        </div>
      )}

      {/* Notes grouped by client */}
      {regularNotes.length === 0 && withFlags.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">📝</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No notes in this period</h3>
          <p className="text-slate-500 text-sm">Try expanding the date range above, or notes will appear after staff clock out.</p>
        </div>
      ) : clientGroups.length > 0 ? (
        <div className="space-y-5">
          <h2 className="text-lg font-bold text-slate-800">Notes by Client</h2>
          {clientGroups.map(([clientName, notes]) => {
            const unsigned = notes.filter(n => !n.cleared).length;
            const lastNote = notes[0]?.clockIn;
            return (
              <div key={clientName} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg">🏠</span>
                    <h3 className="font-bold text-slate-900">{clientName}</h3>
                    <span className="text-xs text-slate-400">
                      {notes.length} note{notes.length !== 1 ? "s" : ""}
                      {lastNote ? ` · Last: ${fmtDate(lastNote)}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {unsigned > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                        {unsigned} awaiting sign-off
                      </span>
                    )}
                    {unsigned === 0 && notes.length > 0 && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">✓ All signed off</span>
                    )}
                    <Link
                      href={`${baseUrl}?client=${encodeURIComponent(clientName)}&days=all`}
                      className="text-xs font-semibold hover:underline"
                      style={{ color: "#1a3a52" }}>
                      Full history →
                    </Link>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {notes.map((n, i) => (
                    <div key={`${n.visitId}-${n.reportId}-${i}`} className={`p-4 ${n.cleared ? "opacity-60" : ""}`}>
                      <NoteCard n={n} showFlag={false} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
