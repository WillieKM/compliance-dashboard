import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const amber = "#b45309";

export default async function AFHVisitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: visit } = await supabase
    .from("care_visits")
    .select("*, visit_service_reports(*)")
    .eq("id", id)
    .eq("facility_id", profile.facility_id)
    .maybeSingle();

  if (!visit) notFound();

  const report = visit.visit_service_reports?.[0] ?? null;
  const clockIn  = visit.clock_in_time  ? new Date(visit.clock_in_time)  : null;
  const clockOut = visit.clock_out_time ? new Date(visit.clock_out_time) : null;
  const mins = visit.duration_minutes ?? (clockIn && clockOut
    ? Math.round((clockOut.getTime() - clockIn.getTime()) / 60000) : null);

  const adlList: { task: string; completed: boolean }[] = report?.adl_checklist ?? [];
  const completedAdl = adlList.filter((a) => a.completed).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/dashboard/afh/visits" className="text-sm hover:underline" style={{ color: amber }}>
          ← Visit Log
        </Link>
        <h1 className="text-2xl font-bold mt-2" style={{ color: amber }}>
          Visit — {visit.client_name}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {visit.caregiver_name} · {clockIn?.toLocaleDateString()}
        </p>
      </div>

      {/* Visit summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {[
            { label: "Caregiver",  value: visit.caregiver_name || "—" },
            { label: "Client",     value: visit.client_name || "—" },
            { label: "Clock In",   value: clockIn ? clockIn.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—" },
            { label: "Clock Out",  value: clockOut ? clockOut.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Still active" },
            { label: "Duration",   value: mins ? `${Math.floor(mins / 60)}h ${mins % 60}m` : "—" },
            { label: "Status",     value: visit.status },
            { label: "GPS In",     value: visit.clock_in_lat ? `${Number(visit.clock_in_lat).toFixed(4)}, ${Number(visit.clock_in_lng).toFixed(4)}` : "Not captured" },
            { label: "GPS Out",    value: visit.clock_out_lat ? `${Number(visit.clock_out_lat).toFixed(4)}, ${Number(visit.clock_out_lng).toFixed(4)}` : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{label}</p>
              <p className="font-semibold text-slate-900 mt-0.5 capitalize">{value}</p>
            </div>
          ))}
        </div>
        {visit.clock_in_lat && (
          <div className="mt-4">
            <a
              href={`https://www.google.com/maps?q=${visit.clock_in_lat},${visit.clock_in_lng}`}
              target="_blank" rel="noreferrer"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              📍 View clock-in location on Google Maps →
            </a>
          </div>
        )}
      </div>

      {!report ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <p className="text-3xl mb-3">📋</p>
          <h3 className="font-bold text-slate-700 mb-1">No service report submitted yet</h3>
          <p className="text-sm text-slate-500">The caregiver has not yet submitted a service report for this visit.</p>
        </div>
      ) : (
        <>
          {/* Incidents */}
          {(report.fall_occurred || report.incident_occurred) && (
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
              <p className="font-bold text-red-900 mb-2">⚠ Incidents Reported</p>
              {report.fall_occurred && <p className="text-sm text-red-800">• Fall occurred during this visit</p>}
              {report.incident_occurred && <p className="text-sm text-red-800">• Safety incident occurred</p>}
              {report.incident_description && <p className="text-sm text-red-700 mt-2 italic">"{report.incident_description}"</p>}
            </div>
          )}

          {/* ADL Checklist */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">ADL Checklist</h2>
              <span className="text-sm font-semibold text-emerald-600">{completedAdl}/{adlList.length} completed</span>
            </div>
            {adlList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {adlList.map((item) => (
                  <div key={item.task} className={`flex items-center gap-2 rounded-lg p-2.5 text-sm ${item.completed ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-500 line-through"}`}>
                    <span className={item.completed ? "text-emerald-500 font-bold" : "text-slate-300"}>
                      {item.completed ? "✓" : "○"}
                    </span>
                    {item.task}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No ADL checklist recorded</p>
            )}
          </div>

          {/* Clinical Q&A */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-4">Clinical Q&A — Service Report</h2>
            <div className="space-y-3">
              {[
                { label: "Client's overall mood and demeanor",             value: report.mood_demeanor },
                { label: "Any noticeable changes in behavior / health",    value: report.behavior_changes },
                { label: "Level of cooperation and engagement",            value: report.cooperation_level },
                { label: "Morning routine assistance",                     value: report.morning_routine },
                { label: "Meal preparation and feeding",                   value: report.meal_preparation },
                { label: "Any anticipated changes in care plan",           value: report.care_plan_changes },
                { label: "Pain level",                                     value: report.pain_level },
              ].filter((q) => q.value).map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-sm text-slate-800 font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Caregiver notes — always shown */}
          <div className="bg-white rounded-2xl border-2 border-amber-200 p-5 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-2">📝 Caregiver Notes</h2>
            {report.caregiver_notes ? (
              <p className="text-sm text-slate-700 leading-relaxed">{report.caregiver_notes}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">No notes provided for this visit.</p>
            )}
          </div>

          <div className="text-xs text-slate-400 text-right">
            Report submitted: {report.submitted_at ? new Date(report.submitted_at).toLocaleString() : "—"} ·
            SR-{report.id?.slice(0, 8).toUpperCase()}
          </div>
        </>
      )}
    </div>
  );
}
