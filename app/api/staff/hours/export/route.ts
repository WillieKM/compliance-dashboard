import { NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const weekParam = searchParams.get("week");

  const now = new Date();
  const weekStart = weekParam ? new Date(weekParam + "T00:00:00") : getWeekStart(now);
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23, 59, 59);
  const weekStartStr = weekStart.toISOString().split("T")[0];
  const weekEndStr   = weekEnd.toISOString().split("T")[0];

  const db = admin();
  const [{ data: staff }, { data: visits }, { data: shifts }] = await Promise.all([
    db.from("staff").select("id, first_name, last_name, role").eq("facility_id", profile.facility_id).eq("status", "Active").order("last_name"),
    db.from("care_visits").select("staff_id, duration_minutes").eq("facility_id", profile.facility_id).eq("status", "completed").gte("clock_in_time", weekStart.toISOString()).lte("clock_in_time", weekEnd.toISOString()),
    db.from("shifts").select("staff_id, start_time, end_time").eq("facility_id", profile.facility_id).in("status", ["accepted", "completed"]).gte("shift_date", weekStartStr).lte("shift_date", weekEndStr),
  ]);

  const map: Record<string, { name: string; role: string; visitMinutes: number; shiftMinutes: number; visitCount: number }> = {};
  for (const s of staff ?? []) {
    map[s.id] = { name: `${s.last_name}, ${s.first_name}`, role: s.role ?? "Caregiver", visitMinutes: 0, shiftMinutes: 0, visitCount: 0 };
  }
  for (const v of visits ?? []) {
    if (v.staff_id && map[v.staff_id]) {
      map[v.staff_id].visitMinutes += v.duration_minutes ?? 0;
      map[v.staff_id].visitCount++;
    }
  }
  for (const shift of shifts ?? []) {
    if (!shift.staff_id || !map[shift.staff_id] || !shift.start_time || !shift.end_time) continue;
    const [sh, sm] = shift.start_time.split(":").map(Number);
    const [eh, em] = shift.end_time.split(":").map(Number);
    const dur = (eh * 60 + em) - (sh * 60 + sm);
    if (dur > 0) map[shift.staff_id].shiftMinutes += dur;
  }

  const rows = Object.values(map)
    .map(r => {
      const totalMins  = Math.max(r.visitMinutes, r.shiftMinutes);
      const totalHours = Math.round(totalMins / 6) / 10;
      const regular    = Math.min(totalHours, 40);
      const overtime   = Math.max(0, totalHours - 40);
      return { ...r, totalHours, regular, overtime };
    })
    .filter(r => r.totalHours > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const orgName = profile.organizations?.name ?? "Agency";
  const lines: string[] = [
    `"${orgName} — Staff Hours Export"`,
    `"Week: ${weekStartStr} to ${weekEndStr}"`,
    `"Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}"`,
    "",
    ["Name", "Role", "Regular Hours", "Overtime Hours", "Total Hours", "Visit Count"].join(","),
    ...rows.map(r =>
      [`"${r.name}"`, `"${r.role}"`, r.regular, r.overtime, r.totalHours, r.visitCount].join(",")
    ),
    "",
    `"Total staff with hours: ${rows.length}"`,
    `"Total agency hours: ${Math.round(rows.reduce((s, r) => s + r.totalHours, 0) * 10) / 10}"`,
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="staff-hours-${weekStartStr}.csv"`,
    },
  });
}
