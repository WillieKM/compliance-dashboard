import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { visitId, newDate } = await req.json();
  if (!visitId || !newDate) return NextResponse.json({ error: "visitId and newDate required" }, { status: 400 });

  const db = admin();

  const { data: visit } = await db
    .from("care_visits")
    .select("id, facility_id, clock_in_time")
    .eq("id", visitId)
    .eq("facility_id", profile.facility_id)
    .single();

  if (!visit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Preserve the time-of-day, just change the date
  const existing = new Date(visit.clock_in_time);
  const [year, month, day] = (newDate as string).split("-").map(Number);
  const adjusted = new Date(Date.UTC(year, month - 1, day, existing.getUTCHours(), existing.getUTCMinutes(), 0));

  const { error } = await db
    .from("care_visits")
    .update({ clock_in_time: adjusted.toISOString() })
    .eq("id", visitId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
