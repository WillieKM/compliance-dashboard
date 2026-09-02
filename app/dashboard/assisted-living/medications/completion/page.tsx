import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const purple = "#9333ea";

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function MARCompletionPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const now       = new Date();
  const weekStart = week ? new Date(week + "T00:00:00") : getWeekStart(now);
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23, 59, 59, 999);
  const prevWeek  = new Date(weekStart); prevWeek.setDate(weekStart.getDate() - 7);
  const nextWeek  = new Date(weekStart); nextWeek.setDate(weekStart.getDate() + 7);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const db = adminClient();
  const fid = profile.facility_id;

  const [{ data: meds }, { data: logs }] = await Promise.all([
    db.from("medication_records")
      .select("id, resident_name, medication_name, dosage, time_slot, is_controlled")
      .eq("facility_id", fid)
      .eq("status", "active"),
    db.from("mar_log")
      .select("medication_id, resident_name, given, administered_at")
      .eq("facility_id", fid)
      .gte("administered_at", weekStart.toISOString())
      .lte("administered_at", weekEnd.toISOString()),
  ]);

  const allMeds    = meds ?? [];
  const allLogs    = logs ?? [];
  const scheduledMeds = allMeds.filter(m => m.time_slot !== "prn");

  // ── Per-day completion ──────────────────────────────────────────
  const dayStats = days.map(day => {
    const dayLogs = allLogs.filter(l => l.administered_at?.startsWith(day));
    const given   = dayLogs.filter(l => l.given).length;
    const missed  = dayLogs.filter(l => !l.given).length;
    const scheduled = scheduledMeds.length;
    const logged  = given + missed;
    const pct     = scheduled > 0 ? Math.round((given / scheduled) * 100) : null;
    return { day, scheduled, given, missed, pending: scheduled - logged, pct };
  });

  const weekGiven     = dayStats.reduce((s, d) => s + d.given, 0);
  const weekScheduled = scheduledMeds.length * 7;
  const weekPct       = weekScheduled > 0 ? Math.round((weekGiven / weekScheduled) * 100) : null;

  // ── Per-resident breakdown ──────────────────────────────────────
  const residentNames = [...new Set(allMeds.map(m => m.resident_name))].sort();
  const residentStats = residentNames.map(name => {
    const resMeds = scheduledMeds.filter(m => m.resident_name === name);
    const resLogs = allLogs.filter(l => l.resident_name === name);
    const given   = resLogs.filter(l => l.given).length;
    const missed  = resLogs.filter(l => !l.given).length;
    const total   = resMeds.length * 7;
    const pct     = total > 0 ? Math.round((given / total) * 100) : null;
    return { name, total, given, missed, pending: total - given - missed, pct };
  });

  const today = now.toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href="/dashboard/assisted-living/medications" className="text-sm hover:underline" style={{ color: purple }}>← Medications</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">eMAR Completion Rate</h1>
          <p className="text-slate-500 text-sm mt-0.5">WAC 388-78A-2570 · Weekly med pass compliance by resident</p>
        </div>
        <Link href="/dashboard/assisted-living/medications/today"
          className="px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90"
          style={{ backgroundColor: purple }}>
          Today&apos;s eMAR →
        </Link>
      </div>

      {/* Week nav */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between shadow-sm">
        <Link href={`?week=${prevWeek.toISOString().split("T")[0]}`} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold">← Prev</Link>
        <div className="text-center">
          <p className="font-bold text-slate-900">{fmtDate(weekStart)} – {fmtDate(weekEnd)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{scheduledMeds.length} active medications (excl. PRN)</p>
        </div>
        <Link href={`?week=${nextWeek.toISOString().split("T")[0]}`} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold">Next →</Link>
      </div>

      {/* Week summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Week Completion",  value: weekPct !== null ? `${weekPct}%` : "—", cls: weekPct !== null && weekPct >= 90 ? "bg-emerald-50 border-emerald-200 text-emerald-800" : weekPct !== null && weekPct >= 75 ? "bg-purple-50 border-purple-200 text-purple-800" : "bg-red-50 border-red-200 text-red-800" },
          { label: "Doses Given",      value: weekGiven,                               cls: "bg-white border-slate-200 text-slate-700" },
          { label: "Scheduled Total",  value: weekScheduled,                           cls: "bg-white border-slate-200 text-slate-700" },
          { label: "Residents",        value: residentNames.length,                    cls: "bg-white border-slate-200 text-slate-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs font-semibold mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Day-by-day bar chart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="font-bold text-slate-900 mb-4">Daily Completion</h2>
        <div className="grid grid-cols-7 gap-2">
          {dayStats.map(d => {
            const isToday  = d.day === today;
            const isFuture = d.day > today;
            const barH     = d.pct !== null ? d.pct : 0;
            const barColor = isFuture ? "#e2e8f0" : d.pct === null ? "#e2e8f0" : d.pct >= 90 ? "#10b981" : d.pct >= 75 ? "#f59e0b" : "#ef4444";
            return (
              <div key={d.day} className="flex flex-col items-center gap-1">
                <span className="text-xs font-bold" style={{ color: isFuture ? "#94a3b8" : d.pct !== null && d.pct >= 90 ? "#059669" : d.pct !== null && d.pct >= 75 ? "#d97706" : "#dc2626" }}>
                  {isFuture ? "—" : d.pct !== null ? `${d.pct}%` : "—"}
                </span>
                <div className="w-full bg-slate-100 rounded-full overflow-hidden" style={{ height: 80 }}>
                  <div className="w-full rounded-full transition-all" style={{ height: `${isFuture ? 0 : barH}%`, backgroundColor: barColor, marginTop: `${100 - (isFuture ? 0 : barH)}%` }} />
                </div>
                <span className={`text-xs font-semibold ${isToday ? "text-purple-700" : "text-slate-500"}`}>
                  {new Date(d.day + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span className="text-xs text-slate-400">{new Date(d.day + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                {isToday && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">Today</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-resident breakdown */}
      {residentStats.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">💊</p>
          <p className="text-slate-500">No active medications. <Link href="/dashboard/assisted-living/medications/new" className="font-semibold hover:underline" style={{ color: purple }}>Add a medication →</Link></p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ backgroundColor: purple }}>
            <h2 className="font-bold text-white">By Resident — Week of {fmtDate(weekStart)}</h2>
          </div>
          <div className="divide-y">
            {residentStats.map(r => (
              <div key={r.name} className="p-4">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div>
                    <span className="font-semibold text-slate-900">{r.name}</span>
                    <span className="text-xs text-slate-400 ml-2">{r.total} scheduled doses</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-emerald-700 font-semibold">✓ {r.given} given</span>
                    {r.missed  > 0 && <span className="text-red-600 font-semibold">✕ {r.missed} missed</span>}
                    {r.pending > 0 && <span className="text-slate-400">{r.pending} pending</span>}
                    <span className={`text-sm font-bold ${r.pct === null ? "text-slate-300" : r.pct >= 90 ? "text-emerald-600" : r.pct >= 75 ? "text-purple-600" : "text-red-600"}`}>
                      {r.pct !== null ? `${r.pct}%` : "—"}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${r.pct ?? 0}%`,
                      backgroundColor: r.pct === null ? "#e2e8f0" : r.pct >= 90 ? "#10b981" : r.pct >= 75 ? "#f59e0b" : "#ef4444",
                    }}
                  />
                </div>
                {r.pct !== null && r.pct < 75 && (
                  <p className="text-xs text-red-600 mt-1 font-medium">⚠ Below 75% — review missed doses and follow up with staff</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400">Completion rate = doses marked Given ÷ total scheduled (non-PRN) doses for the week. PRN meds are excluded from the rate calculation.</p>
    </div>
  );
}
