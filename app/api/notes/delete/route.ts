import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reportId } = await req.json();
  if (!reportId) return NextResponse.json({ error: "reportId required" }, { status: 400 });

  const db = admin();

  // Verify the report belongs to this facility before deleting
  const { data: report } = await db
    .from("visit_service_reports")
    .select("id, visit_id, facility_id")
    .eq("id", reportId)
    .eq("facility_id", profile.facility_id)
    .single();

  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await db
    .from("visit_service_reports")
    .delete()
    .eq("id", reportId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If the linked care_visit was a notes-only entry (midnight clock-in, no clock-out)
  // and has no remaining reports, clean it up too
  const { data: visit } = await db
    .from("care_visits")
    .select("id, clock_in_time, clock_out_time")
    .eq("id", report.visit_id)
    .single();

  if (visit) {
    const clockIn = new Date(visit.clock_in_time);
    const isNotesOnly = clockIn.getUTCHours() === 0 && clockIn.getUTCMinutes() === 0 && !visit.clock_out_time;
    if (isNotesOnly) {
      const { count } = await db
        .from("visit_service_reports")
        .select("id", { count: "exact", head: true })
        .eq("visit_id", report.visit_id);
      if ((count ?? 0) === 0) {
        await db.from("care_visits").delete().eq("id", report.visit_id);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
