import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient as adminClient } from "@supabase/supabase-js";
import IncidentClearButton from "./IncidentClearButton";
import NoteDeleteButton from "./NoteDeleteButton";
import NoteDateEditButton from "./NoteDateEditButton";
import NoteSignOffButton from "./NoteSignOffButton";

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
}

export default async function NotesReviewPage({ settingSlug, settingLabel, backHref, headerBg }: Props) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { data } = await admin()
    .from("care_visits")
    .select(`
      id,
      caregiver_name,
      client_name,
      clock_in_time,
      clock_out_time,
      duration_minutes,
      visit_service_reports (
        id,
        caregiver_notes,
        mood_demeanor,
        behavior_changes,
        fall_occurred,
        incident_occurred,
        incident_description,
        submitted_at,
        cleared,
        cleared_by,
        cleared_at,
        supervisor_notes
      )
    `)
    .eq("facility_id", profile.facility_id)
    .order("clock_in_time", { ascending: false })
    .limit(100);

  type Report = {
    id: string;
    caregiver_notes: string | null;
    mood_demeanor: string | null;
    behavior_changes: string | null;
    fall_occurred: boolean;
    incident_occurred: boolean;
    incident_description: string | null;
    submitted_at: string;
    cleared: boolean | null;
    cleared_by: string | null;
    cleared_at: string | null;
    supervisor_notes: string | null;
  };

  const allEntries = (data ?? [])
    .flatMap(v => {
      const reports = (v.visit_service_reports as Report[] | null) ?? [];
      return reports
        .map(r => ({
          reportId:        r.id,
          visitId:         v.id,
          caregiver:       v.caregiver_name,
          client:          v.client_name,
          clockIn:         v.clock_in_time,
          clockOut:        v.clock_out_time,
          duration:        v.duration_minutes,
          note:            r.caregiver_notes ?? "",
          mood:            r.mood_demeanor,
          behaviors:       r.behavior_changes,
          fallFlag:        r.fall_occurred,
          incidentFlag:    r.incident_occurred,
          incidentDesc:    r.incident_description,
          submittedAt:     r.submitted_at,
          cleared:         r.cleared ?? false,
          clearedBy:       r.cleared_by,
          clearedAt:       r.cleared_at,
          supervisorNotes: r.supervisor_notes,
        }));
    });

  const withFlags       = allEntries.filter(n => (n.fallFlag || n.incidentFlag) && !n.cleared);
  const clearedEntries  = allEntries.filter(n => (n.fallFlag || n.incidentFlag) && n.cleared);
  const regularNotes    = allEntries.filter(n => !n.fallFlag && !n.incidentFlag);

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
              {n.client && <span className="text-slate-500 text-sm">→ {n.client}</span>}
              {showFlag && n.fallFlag     && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">🩹 Fall</span>}
              {showFlag && n.incidentFlag && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">⚠ Incident</span>}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {fmtDate(n.clockIn)} · {fmtTime(n.clockIn)} – {fmtTime(n.clockOut)}
              {n.duration ? ` (${Math.floor(n.duration / 60)}h ${n.duration % 60}m)` : ""}
            </p>
          </div>
            <div className="flex items-center gap-1 shrink-0">
            <NoteDateEditButton visitId={n.visitId} currentDate={n.clockIn} />
            <NoteDeleteButton reportId={n.reportId} />
            <Link href={`/dashboard/${settingSlug === "assisted-living" ? "home-care" : settingSlug}/visits/${n.visitId}`}
              className="text-xs font-semibold text-blue-600 hover:underline">
              Full Report →
            </Link>
          </div>
        </div>

        {n.incidentDesc && (
          <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            <span className="font-semibold">Incident description: </span>{n.incidentDesc}
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

        {/* Incident clearance or regular sign-off */}
        {(n.fallFlag || n.incidentFlag) ? (
          <IncidentClearButton
            reportId={n.reportId}
            clearedBy={n.clearedBy}
            clearedAt={n.clearedAt}
            supervisorNotes={n.supervisorNotes}
          />
        ) : (
          <NoteSignOffButton
            reportId={n.reportId}
            clearedBy={n.clearedBy}
            clearedAt={n.clearedAt}
            supervisorNotes={n.supervisorNotes}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl text-white px-5 py-4" style={{ background: headerBg }}>
        <Link href={backHref} className="text-white/70 text-sm hover:text-white mb-1 inline-block">
          ← {settingLabel} Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Staff Notes Review</h1>
        <p className="text-white/70 text-sm mt-0.5">All caregiver notes submitted after clock-out</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-slate-900">{allEntries.length}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Total Notes</p>
        </div>
        <div className={`rounded-xl border-2 p-4 text-center ${withFlags.length > 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
          <p className={`text-3xl font-bold ${withFlags.length > 0 ? "text-red-700" : "text-slate-500"}`}>{withFlags.length}</p>
          <p className={`text-xs uppercase tracking-wide mt-1 font-semibold ${withFlags.length > 0 ? "text-red-600" : "text-slate-400"}`}>Pending Incidents</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
          <p className="text-3xl font-bold text-emerald-700">{clearedEntries.length}</p>
          <p className="text-xs text-emerald-600 uppercase tracking-wide mt-1 font-semibold">Cleared</p>
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
          <div className="space-y-3">
            {withFlags.map(n => (
              <NoteCard key={`${n.visitId}-${n.reportId}`} n={n} />
            ))}
          </div>
        </div>
      )}

      {/* Cleared incidents report */}
      {clearedEntries.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-3">Cleared Incident Reports ({clearedEntries.length})</h2>
          <div className="space-y-3">
            {clearedEntries.map(n => (
              <div key={`${n.visitId}-${n.reportId}`} className="opacity-80">
                <NoteCard n={n} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular notes */}
      {regularNotes.length === 0 && withFlags.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">📝</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No notes submitted yet</h3>
          <p className="text-slate-500">Notes appear here after staff clock out and submit their service report.</p>
        </div>
      ) : regularNotes.length > 0 ? (
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-3">All Notes</h2>
          <div className="space-y-3">
            {regularNotes.map((n, i) => (
              <NoteCard key={`${n.visitId}-${i}`} n={n} showFlag={false} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
