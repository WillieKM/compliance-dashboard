import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/portal/[slug]/visit — clock in, clock out, or submit report
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = admin();
  const body = await request.json();

  // Resolve org → facility_id
  const { data: org } = await db.from("organizations").select("id").eq("slug", slug).maybeSingle();
  if (!org) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

  const facilityId = org.id;
  const { action } = body;

  // ── Clock In ──────────────────────────────────────────────────────
  if (action === "clock_in") {
    const { caregiverName, clientName, staffId, residentId, lat, lng } = body;
    const { data: visit, error } = await db.from("care_visits").insert({
      facility_id: facilityId,
      staff_id: staffId || null,
      resident_id: residentId || null,
      caregiver_name: caregiverName,
      client_name: clientName,
      care_setting: "HOME_CARE",
      clock_in_time: new Date().toISOString(),
      clock_in_lat: lat ?? null,
      clock_in_lng: lng ?? null,
      status: "active",
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ visitId: visit.id });
  }

  // ── Clock Out ─────────────────────────────────────────────────────
  if (action === "clock_out") {
    const { visitId, lat, lng } = body;
    const { data: v } = await db.from("care_visits").select("clock_in_time").eq("id", visitId).single();
    const now = new Date().toISOString();
    const mins = v?.clock_in_time
      ? Math.round((new Date(now).getTime() - new Date(v.clock_in_time).getTime()) / 60000)
      : null;
    const { error } = await db.from("care_visits").update({
      clock_out_time: now,
      clock_out_lat: lat ?? null,
      clock_out_lng: lng ?? null,
      status: "completed",
      duration_minutes: mins,
    }).eq("id", visitId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ── Submit Service Report ─────────────────────────────────────────
  if (action === "submit_report") {
    const { visitId, mood, behaviorChanges, cooperationLevel, morningRoutine,
      mealPrep, carePlanChanges, painLevel, fallOccurred, incidentOccurred,
      incidentDesc, adlChecklist, caregiverNotes } = body;
    const { error } = await db.from("visit_service_reports").insert({
      visit_id: visitId,
      facility_id: facilityId,
      mood_demeanor: mood,
      behavior_changes: behaviorChanges,
      cooperation_level: cooperationLevel,
      morning_routine: morningRoutine,
      meal_preparation: mealPrep,
      care_plan_changes: carePlanChanges,
      pain_level: painLevel,
      fall_occurred: fallOccurred,
      incident_occurred: incidentOccurred,
      incident_description: incidentDesc || null,
      adl_checklist: adlChecklist,
      caregiver_notes: caregiverNotes,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ── Submit Notes Only ─────────────────────────────────────────────
  if (action === "submit_notes") {
    const { caregiverName, clientName, staffId, residentId, noteDate, noteType, notes } = body;
    const { data: visit } = await db.from("care_visits").insert({
      facility_id: facilityId,
      staff_id: staffId || null,
      resident_id: residentId || null,
      caregiver_name: caregiverName,
      client_name: clientName,
      care_setting: "HOME_CARE",
      clock_in_time: `${noteDate}T00:00:00Z`,
      status: "completed",
      notes: `[${noteType}] ${notes}`,
    }).select().single();
    if (visit?.data?.id) {
      await db.from("visit_service_reports").insert({
        visit_id: visit.data.id,
        facility_id: facilityId,
        caregiver_notes: notes,
        adl_checklist: [],
      });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
