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

  // ── Geo-fence helper ──────────────────────────────────────────────
  function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // Geo-fence check against a resident's stored coordinates; logs a
  // dashboard alert (in addition to the visit note) so it isn't missed.
  async function checkGeoFence(residentId: string | null | undefined, lat: number | null, lng: number | null, caregiverName: string, when: "clock-in" | "clock-out") {
    if (!lat || !lng || !residentId) return null;
    const { data: resident } = await db.from("residents")
      .select("lat, lng, first_name, last_name").eq("id", residentId).maybeSingle();
    if (!resident?.lat || !resident?.lng) return null;

    const miles = distanceMiles(lat, lng, resident.lat, resident.lng);
    if (miles <= 0.5) return null;

    const warning = `Caregiver is ${miles.toFixed(1)} miles from client address`;
    await db.from("alerts").insert({
      facility_id: facilityId,
      resident_id: residentId,
      alert_type: "geo_warning",
      title: `GPS mismatch at ${when} — ${resident.first_name} ${resident.last_name}`,
      message: `${caregiverName} was ${miles.toFixed(1)} miles from ${resident.first_name} ${resident.last_name}'s address at ${when}.`,
      due_date: new Date().toISOString().split("T")[0],
    });
    return warning;
  }

  // ── Clock In ──────────────────────────────────────────────────────
  if (action === "clock_in") {
    const { caregiverName, clientName, staffId, residentId, lat, lng, shiftId } = body;

    const geoWarning = await checkGeoFence(residentId, lat ?? null, lng ?? null, caregiverName, "clock-in");

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
      shift_id: shiftId || null,
      notes: geoWarning ? `[GEO WARNING] ${geoWarning}` : null,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ visitId: visit.id, geoWarning });
  }

  // ── Clock Out ─────────────────────────────────────────────────────
  if (action === "clock_out") {
    const { visitId, lat, lng } = body;
    const { data: v } = await db.from("care_visits")
      .select("clock_in_time, resident_id, caregiver_name, notes").eq("id", visitId).single();
    const now = new Date().toISOString();
    const mins = v?.clock_in_time
      ? Math.round((new Date(now).getTime() - new Date(v.clock_in_time).getTime()) / 60000)
      : null;

    const geoWarning = v ? await checkGeoFence(v.resident_id, lat ?? null, lng ?? null, v.caregiver_name, "clock-out") : null;
    const notes = geoWarning ? `${v?.notes ? v.notes + " " : ""}[GEO WARNING] ${geoWarning}` : v?.notes ?? null;

    const { error } = await db.from("care_visits").update({
      clock_out_time: now,
      clock_out_lat: lat ?? null,
      clock_out_lng: lng ?? null,
      status: "completed",
      duration_minutes: mins,
      notes,
    }).eq("id", visitId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, geoWarning });
  }

  // ── Submit Service Report ─────────────────────────────────────────
  if (action === "submit_report") {
    const { visitId, mood, behaviorChanges, cooperationLevel, morningRoutine,
      mealPrep, carePlanChanges, painLevel, fallOccurred, incidentOccurred,
      incidentDesc, adlChecklist, caregiverNotes, shiftId } = body;
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
    // Mark the linked shift as completed
    if (shiftId) {
      await db.from("shifts").update({ status: "completed" }).eq("id", shiftId).eq("status", "accepted");
    }
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
    }).select("id").single();
    if (visit?.id) {
      await db.from("visit_service_reports").insert({
        visit_id: visit.id,
        facility_id: facilityId,
        caregiver_notes: notes,
        adl_checklist: [],
        submitted_at: new Date().toISOString(),
      });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
