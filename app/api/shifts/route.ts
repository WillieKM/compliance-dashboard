import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sendShiftAssignmentEmail } from "@/lib/email";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = admin();
  const { data: profile } = await db.from("profiles").select("facility_id").eq("id", user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { data, error } = await db
    .from("shifts")
    .select("*, staff(first_name, last_name, email), residents(first_name, last_name, address)")
    .eq("facility_id", profile.facility_id)
    .order("shift_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = admin();
  const { data: profile } = await db.from("profiles").select("facility_id").eq("id", user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const body = await request.json();
  const { staffId, residentId, shiftDate, startTime, endTime, notes } = body;
  const facilityId = profile.facility_id;

  // Fetch staff, resident, and org in parallel
  const [staffRes, residentRes, orgRes] = await Promise.all([
    db.from("staff").select("first_name, last_name, email").eq("id", staffId).maybeSingle(),
    residentId ? db.from("residents").select("first_name, last_name, address").eq("id", residentId).maybeSingle() : Promise.resolve({ data: null }),
    db.from("organizations").select("name, slug, primary_color").eq("id", facilityId).maybeSingle(),
  ]);

  const staff   = staffRes.data;
  const resident = residentRes.data;
  const org     = orgRes.data;

  if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  const { data: shift, error } = await db.from("shifts").insert({
    facility_id:  facilityId,
    staff_id:     staffId,
    resident_id:  residentId || null,
    shift_date:   shiftDate,
    start_time:   startTime,
    end_time:     endTime || null,
    notes:        notes || null,
    status:       "pending",
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const respondUrl = `${appUrl}/shifts/${shift.id}/accept`;
  const clientName = resident ? `${resident.first_name} ${resident.last_name}` : "Client";

  if (staff.email) {
    try {
      await sendShiftAssignmentEmail({
        to:            staff.email,
        caregiverName: `${staff.first_name} ${staff.last_name}`,
        agencyName:    org?.name ?? "Your Agency",
        agencyColor:   org?.primary_color ?? "#1a3a52",
        shiftDate,
        startTime,
        endTime:       endTime || null,
        clientName,
        clientAddress: resident?.address ?? null,
        notes:         notes || null,
        respondUrl,
      });
    } catch (e) {
      console.error("Shift email failed:", e);
    }
  }

  return NextResponse.json({ id: shift.id, emailSent: !!staff.email });
}
