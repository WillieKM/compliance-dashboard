import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Public — no auth required (caregiver clicks link from email)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action } = await request.json();
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "action must be 'accept' or 'decline'" }, { status: 400 });
  }

  const db = admin();

  const { data: shift } = await db.from("shifts").select("status, facility_id").eq("id", id).maybeSingle();
  if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  if (shift.status === "completed") return NextResponse.json({ error: "Shift already completed" }, { status: 409 });

  const newStatus = action === "accept" ? "accepted" : "declined";
  const { error } = await db.from("shifts").update({
    status:       newStatus,
    responded_at: new Date().toISOString(),
  }).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let clockInUrl: string | null = null;
  if (action === "accept") {
    const { data: org } = await db.from("organizations").select("slug").eq("id", shift.facility_id).maybeSingle();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    if (org?.slug) clockInUrl = `${appUrl}/portal/${org.slug}/shift/${id}`;
  }

  return NextResponse.json({ ok: true, status: newStatus, clockInUrl });
}
