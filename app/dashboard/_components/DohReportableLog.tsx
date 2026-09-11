import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient as adminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function admin() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const eventTypeLabels: Record<string, string> = {
  abuse:            "Abuse / Neglect",
  neglect:          "Neglect",
  death:            "Unexpected Death",
  serious_injury:   "Serious Injury",
  elopement:        "Elopement",
  medication_error: "Medication Error",
  fall_with_injury: "Fall w/ Injury",
  other:            "Other",
};

const eventTypeBg: Record<string, string> = {
  abuse:            "bg-red-100 text-red-800",
  neglect:          "bg-red-100 text-red-800",
  death:            "bg-slate-200 text-slate-800",
  serious_injury:   "bg-orange-100 text-orange-800",
  elopement:        "bg-rose-100 text-rose-800",
  medication_error: "bg-purple-100 text-purple-800",
  fall_with_injury: "bg-amber-100 text-amber-800",
  other:            "bg-slate-100 text-slate-700",
};

const statusBg: Record<string, string> = {
  pending:      "bg-amber-100 text-amber-800",
  filed:        "bg-blue-100 text-blue-800",
  acknowledged: "bg-indigo-100 text-indigo-800",
  closed:       "bg-emerald-100 text-emerald-800",
};

const statusLabel: Record<string, string> = {
  pending:      "Pending",
  filed:        "Filed with DOH",
  acknowledged: "DOH Acknowledged",
  closed:       "Closed",
};

interface Props {
  careSetting: "HOME_CARE" | "AFH" | "AL";
  settingLabel: string;
  backHref: string;
  headerBg: string;
  wacRef: string;
  newHref: string;
}

export default async function DohReportableLog({ careSetting, settingLabel, backHref, headerBg, wacRef, newHref }: Props) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { data: events } = await admin()
    .from("doh_reportable_events")
    .select("*")
    .eq("facility_id", profile.facility_id)
    .eq("care_setting", careSetting)
    .order("event_date", { ascending: false })
    .limit(300);

  const pending  = (events ?? []).filter(e => e.status === "pending");
  const active   = (events ?? []).filter(e => e.status !== "closed");
  const withCase = (events ?? []).filter(e => e.doh_case_number);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl text-white px-5 py-4" style={{ background: headerBg }}>
        <Link href={backHref} className="text-white/70 text-sm hover:text-white mb-1 inline-block">
          ← {settingLabel} Dashboard
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">DOH Reportable Events</h1>
            <p className="text-white/70 text-sm mt-0.5">{wacRef} — formal DOH notification log</p>
          </div>
          <Link href={newHref}
            className="bg-white font-bold px-4 py-2 rounded-lg text-sm shrink-0 hover:opacity-90"
            style={{ color: "#1e3a5f" }}>
            + Log Event
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Events",        value: (events ?? []).length, cls: "bg-white border-slate-200" },
          { label: "Pending DOH Filing",  value: pending.length,        cls: pending.length > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200" },
          { label: "With DOH Case #",     value: withCase.length,       cls: "bg-white border-slate-200" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs font-semibold uppercase tracking-wide mt-1 text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pending alert */}
      {pending.length > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3">
          <p className="font-bold text-red-900 text-sm">⚠ {pending.length} event{pending.length > 1 ? "s" : ""} pending DOH notification</p>
          <p className="text-xs text-red-700 mt-1">
            WA regulations require DOH notification within specific timeframes (often 24–72 hours). File immediately and update each event with the DOH case number once received.
          </p>
        </div>
      )}

      {/* Events list */}
      {(events ?? []).length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">📋</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No reportable events logged</h3>
          <p className="text-slate-500 text-sm mb-4">
            Use this log to document every event reported to DOH — abuse, neglect, serious injuries, unexpected deaths, elopements, and other mandatory reportable events.
          </p>
          <Link href={newHref}
            className="inline-block text-white px-5 py-2 rounded-lg text-sm font-bold"
            style={{ background: headerBg }}>
            Log First Event
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(events ?? []).map(e => (
            <div key={e.id} className={`bg-white rounded-xl border-2 p-4 shadow-sm ${e.status === "pending" ? "border-amber-200" : e.status === "closed" ? "border-slate-200" : "border-blue-200"}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${eventTypeBg[e.event_type] ?? "bg-slate-100 text-slate-700"}`}>
                    {eventTypeLabels[e.event_type] ?? e.event_type}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBg[e.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {statusLabel[e.status] ?? e.status}
                  </span>
                  {e.doh_case_number && (
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-mono">
                      Case: {e.doh_case_number}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 shrink-0">{fmtDate(e.event_date)}</p>
              </div>
              {e.resident_name && (
                <p className="font-semibold text-slate-900 mt-2 text-sm">{e.resident_name}</p>
              )}
              <p className="text-sm text-slate-700 mt-1">{e.description}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {e.doh_notified_date && (
                  <span>DOH notified: <span className="font-medium text-slate-700">{fmtDate(e.doh_notified_date)}</span></span>
                )}
                {e.doh_notified_by && (
                  <span>By: <span className="font-medium text-slate-700">{e.doh_notified_by}</span></span>
                )}
                {e.created_by && (
                  <span>Logged by: <span className="font-medium text-slate-700">{e.created_by}</span></span>
                )}
              </div>
              {e.follow_up_notes && (
                <p className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{e.follow_up_notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
