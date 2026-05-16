import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient as adminClient } from "@supabase/supabase-js";

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
        submitted_at
      )
    `)
    .eq("facility_id", profile.facility_id)
    .order("clock_in_time", { ascending: false })
    .limit(100);

  // Flatten to only visits that have notes
  const notesEntries = (data ?? [])
    .flatMap(v => {
      const reports = (v.visit_service_reports as {
        id: string;
        caregiver_notes: string | null;
        mood_demeanor: string | null;
        behavior_changes: string | null;
        fall_occurred: boolean;
        incident_occurred: boolean;
        submitted_at: string;
      }[] | null) ?? [];
      return reports
        .filter(r => r.submitted_at)
        .map(r => ({
          visitId:      v.id,
          caregiver:    v.caregiver_name,
          client:       v.client_name,
          clockIn:      v.clock_in_time,
          clockOut:     v.clock_out_time,
          duration:     v.duration_minutes,
          note:         r.caregiver_notes!,
          mood:         r.mood_demeanor,
          behaviors:    r.behavior_changes,
          fallFlag:     r.fall_occurred,
          incidentFlag: r.incident_occurred,
          submittedAt:  r.submitted_at,
        }));
    });

  const withFlags = notesEntries.filter(n => n.fallFlag || n.incidentFlag);

  function fmtDate(s: string | null) {
    if (!s) return "—";
    return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  function fmtTime(s: string | null) {
    if (!s) return "";
    return new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-slate-900">{notesEntries.length}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Total Notes</p>
        </div>
        <div className={`rounded-xl border-2 p-4 text-center ${withFlags.length > 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
          <p className={`text-3xl font-bold ${withFlags.length > 0 ? "text-red-700" : "text-slate-500"}`}>{withFlags.length}</p>
          <p className={`text-xs uppercase tracking-wide mt-1 font-semibold ${withFlags.length > 0 ? "text-red-600" : "text-slate-400"}`}>Incidents / Falls</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-slate-900">
            {new Set(notesEntries.map(n => n.caregiver)).size}
          </p>
          <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Staff Members</p>
        </div>
      </div>

      {/* Incident flags alert */}
      {withFlags.length > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-900 mb-2">⚠ Notes with Incidents or Falls</p>
          {withFlags.map(n => (
            <div key={n.visitId} className="text-sm text-red-800 flex items-start gap-2 py-1 border-b border-red-100 last:border-0">
              <span>{n.fallFlag ? "🩹 Fall" : "⚠ Incident"}</span>
              <span><strong>{n.caregiver}</strong> on {fmtDate(n.clockIn)} — {n.note.slice(0, 80)}{n.note.length > 80 ? "…" : ""}</span>
            </div>
          ))}
        </div>
      )}

      {/* Notes list */}
      {notesEntries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">📝</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No notes submitted yet</h3>
          <p className="text-slate-500">Notes appear here after staff clock out and submit their service report.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notesEntries.map((n, i) => (
            <div key={`${n.visitId}-${i}`} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              {/* Note header */}
              <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">👤 {n.caregiver}</span>
                    {n.client && <span className="text-slate-500 text-sm">→ {n.client}</span>}
                    {n.fallFlag && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">🩹 Fall</span>}
                    {n.incidentFlag && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">⚠ Incident</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {fmtDate(n.clockIn)} · {fmtTime(n.clockIn)} – {fmtTime(n.clockOut)}
                    {n.duration ? ` (${Math.floor(n.duration / 60)}h ${n.duration % 60}m)` : ""}
                  </p>
                </div>
                <Link href={`/dashboard/${settingSlug === "assisted-living" ? "home-care" : settingSlug}/visits/${n.visitId}`}
                  className="text-xs font-semibold text-blue-600 hover:underline shrink-0">
                  Full Report →
                </Link>
              </div>

              {/* The note */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{n.note}</p>
              </div>

              {/* Quick clinical info */}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
