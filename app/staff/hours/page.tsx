import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function StaffHoursPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const now = new Date();
  const weekStart = week ? new Date(week + "T00:00:00") : getWeekStart(now);
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23, 59, 59);
  const prevWeek  = new Date(weekStart); prevWeek.setDate(weekStart.getDate() - 7);
  const nextWeek  = new Date(weekStart); nextWeek.setDate(weekStart.getDate() + 7);

  const weekStartStr = weekStart.toISOString().split("T")[0];
  const weekEndStr   = weekEnd.toISOString().split("T")[0];

  const db = adminClient();
  const { data: staff } = await db
    .from("staff").select("id, first_name, last_name, role")
    .eq("facility_id", profile.facility_id).eq("status", "Active").order("first_name");

  const { data: visits } = await db
    .from("care_visits")
    .select("staff_id, caregiver_name, clock_in_time, clock_out_time, duration_minutes, status")
    .eq("facility_id", profile.facility_id)
    .eq("status", "completed")
    .gte("clock_in_time", weekStart.toISOString())
    .lte("clock_in_time", weekEnd.toISOString());

  const { data: shifts } = await db
    .from("shifts")
    .select("staff_id, start_time, end_time, shift_date, status")
    .eq("facility_id", profile.facility_id)
    .in("status", ["accepted", "completed"])
    .gte("shift_date", weekStartStr)
    .lte("shift_date", weekEndStr);

  type HoursRow = { name: string; role: string; visitMinutes: number; shiftMinutes: number; totalHours: number; visitCount: number; overtime: boolean };
  const map: Record<string, HoursRow> = {};

  for (const s of staff ?? []) {
    map[s.id] = { name: `${s.first_name} ${s.last_name}`, role: s.role ?? "Caregiver", visitMinutes: 0, shiftMinutes: 0, totalHours: 0, visitCount: 0, overtime: false };
  }

  for (const v of visits ?? []) {
    const mins = v.duration_minutes ?? 0;
    if (v.staff_id && map[v.staff_id]) {
      map[v.staff_id].visitMinutes += mins;
      map[v.staff_id].visitCount++;
    }
  }

  for (const shift of shifts ?? []) {
    if (!shift.staff_id || !map[shift.staff_id] || !shift.start_time || !shift.end_time) continue;
    const [startH, startM] = shift.start_time.split(":").map(Number);
    const [endH, endM]     = shift.end_time.split(":").map(Number);
    const dur = (endH * 60 + endM) - (startH * 60 + startM);
    if (dur > 0) map[shift.staff_id].shiftMinutes += dur;
  }

  const rows = Object.values(map).map(r => {
    const totalMins  = Math.max(r.visitMinutes, r.shiftMinutes);
    const totalHours = Math.round(totalMins / 6) / 10;
    return { ...r, totalHours, overtime: totalHours > 40 };
  }).sort((a, b) => b.totalHours - a.totalHours);

  const overtimeCount = rows.filter(r => r.overtime).length;
  const totalHoursAll = rows.reduce((sum, r) => sum + r.totalHours, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href="/staff" className="text-blue-600 hover:underline text-sm">← Staff</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Staff Hours</h1>
          <p className="text-slate-500 text-sm mt-0.5">Weekly hours summary from completed visits and accepted shifts</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between shadow-sm">
        <Link href={`?week=${prevWeek.toISOString().split("T")[0]}`} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold">← Prev</Link>
        <div className="text-center">
          <p className="font-bold text-slate-900">
            {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Week of {weekStartStr}</p>
        </div>
        <Link href={`?week=${nextWeek.toISOString().split("T")[0]}`} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold">Next →</Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Agency Hours", value: `${Math.round(totalHoursAll * 10) / 10}h`, cls: "bg-white border-slate-200 text-slate-700" },
          { label: "Active Caregivers",  value: rows.filter(r => r.totalHours > 0).length,   cls: "bg-blue-50 border-blue-200 text-blue-800" },
          { label: "Overtime Flagged",   value: overtimeCount,  cls: overtimeCount > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs font-semibold mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {overtimeCount > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-900 mb-1">⚠ {overtimeCount} caregiver{overtimeCount > 1 ? "s" : ""} over 40 hours this week</p>
          <p className="text-sm text-red-700">Review schedules to ensure compliance with overtime regulations.</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-slate-800">
          <h2 className="font-bold text-white">All Staff — Week of {weekStartStr}</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-3 text-left font-semibold text-slate-600">Name</th>
              <th className="p-3 text-left font-semibold text-slate-600">Role</th>
              <th className="p-3 text-right font-semibold text-slate-600">Visits</th>
              <th className="p-3 text-right font-semibold text-slate-600">Total Hours</th>
              <th className="p-3 text-left font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name} className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                <td className="p-3 font-semibold text-slate-900">{r.name}</td>
                <td className="p-3 text-slate-500">{r.role}</td>
                <td className="p-3 text-right text-slate-600">{r.visitCount}</td>
                <td className={`p-3 text-right font-bold ${r.overtime ? "text-red-600" : r.totalHours > 0 ? "text-slate-900" : "text-slate-300"}`}>
                  {r.totalHours > 0 ? `${r.totalHours}h` : "—"}
                </td>
                <td className="p-3">
                  {r.overtime
                    ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Overtime</span>
                    : r.totalHours > 0
                    ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Active</span>
                    : <span className="text-xs text-slate-300">No hours</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">Hours derived from completed care visits and accepted shifts. Clock-in/out data is most accurate.</p>
    </div>
  );
}
