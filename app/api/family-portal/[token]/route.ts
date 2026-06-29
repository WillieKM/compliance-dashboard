import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Public — validate token and return the resident's upcoming/recent visit info
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = admin();

  const { data: resident } = await db
    .from("residents")
    .select("id, first_name, last_name, facility_id")
    .eq("family_portal_token", token)
    .maybeSingle();

  if (!resident) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [orgRes, upcomingRes, visitsRes] = await Promise.all([
    db.from("organizations").select("name, primary_color, logo_url").eq("id", resident.facility_id).maybeSingle(),
    db.from("schedules")
      .select("id, caregiver_name, scheduled_date, start_time, end_time, care_type, status")
      .eq("resident_id", resident.id).gte("scheduled_date", today).neq("status", "cancelled")
      .order("scheduled_date").order("start_time"),
    db.from("care_visits")
      .select(`
        id, caregiver_name, clock_in_time, clock_out_time, duration_minutes,
        visit_service_reports ( mood_demeanor, caregiver_notes, submitted_at )
      `)
      .eq("resident_id", resident.id).eq("status", "completed").gte("clock_in_time", thirtyDaysAgo)
      .order("clock_in_time", { ascending: false }),
  ]);

  const recentVisits = (visitsRes.data ?? []).map(v => {
    const report = (v.visit_service_reports as { mood_demeanor: string | null; caregiver_notes: string | null; submitted_at: string }[] | null)?.[0];
    return {
      id: v.id,
      caregiverName: v.caregiver_name,
      clockInTime: v.clock_in_time,
      clockOutTime: v.clock_out_time,
      durationMinutes: v.duration_minutes,
      mood: report?.mood_demeanor ?? null,
      notes: report?.caregiver_notes ?? null,
    };
  });

  return NextResponse.json({
    residentName: `${resident.first_name} ${resident.last_name}`,
    org: orgRes.data,
    upcomingVisits: upcomingRes.data ?? [],
    recentVisits,
  });
}
