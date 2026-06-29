import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type VisitJoin = { resident_id: string | null; client_name: string | null; caregiver_name: string | null };
type ReportRow = {
  id: string;
  facility_id: string;
  caregiver_notes: string | null;
  mood_demeanor: string | null;
  behavior_changes: string | null;
  submitted_at: string;
  care_visits: VisitJoin | VisitJoin[] | null;
};

function joinedVisit(row: ReportRow): VisitJoin | null {
  return Array.isArray(row.care_visits) ? row.care_visits[0] ?? null : row.care_visits;
}

// Nightly scan (see .github/workflows/cron-jobs.yml) — looks for slow-
// developing risk patterns in caregiver notes that staff didn't already
// flag with the explicit fall/incident checkboxes. One Claude call per
// resident with new notes, not per note, to keep this cheap.
export async function GET(request: Request) {
  const isAuthorized =
    request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}` ||
    request.headers.get("x-cron-secret") === process.env.CRON_SECRET;
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdmin();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recentReports } = await db
    .from("visit_service_reports")
    .select("id, facility_id, caregiver_notes, mood_demeanor, behavior_changes, submitted_at, care_visits(resident_id, client_name, caregiver_name)")
    .gte("submitted_at", since)
    .not("caregiver_notes", "is", null);

  const byResident = new Map<string, {
    facilityId: string; residentName: string;
    notes: { date: string; caregiver: string; mood: string | null; behaviors: string | null; text: string }[];
  }>();

  for (const r of (recentReports ?? []) as ReportRow[]) {
    const visit = joinedVisit(r);
    if (!visit?.resident_id) continue;
    if (!byResident.has(visit.resident_id)) {
      byResident.set(visit.resident_id, { facilityId: r.facility_id, residentName: visit.client_name ?? "Resident", notes: [] });
    }
    byResident.get(visit.resident_id)!.notes.push({
      date: r.submitted_at, caregiver: visit.caregiver_name ?? "Caregiver",
      mood: r.mood_demeanor, behaviors: r.behavior_changes, text: r.caregiver_notes ?? "",
    });
  }

  let scanned = 0;
  let flagged = 0;

  for (const [residentId, group] of byResident) {
    scanned++;

    const { data: priorVisits } = await db
      .from("care_visits")
      .select("clock_in_time, visit_service_reports(caregiver_notes, mood_demeanor, submitted_at)")
      .eq("resident_id", residentId)
      .lt("clock_in_time", since)
      .order("clock_in_time", { ascending: false })
      .limit(5);

    const priorNotes = (priorVisits ?? [])
      .flatMap(v => (v.visit_service_reports as { caregiver_notes: string | null; mood_demeanor: string | null; submitted_at: string }[] | null) ?? [])
      .filter(r => r.caregiver_notes)
      .map(r => `${r.submitted_at?.split("T")[0]}: ${r.caregiver_notes}${r.mood_demeanor ? ` (mood: ${r.mood_demeanor})` : ""}`);

    const newNotesText = group.notes
      .map(n => `${n.date.split("T")[0]} (${n.caregiver}): ${n.text}${n.mood ? ` (mood: ${n.mood})` : ""}${n.behaviors ? ` (behavior: ${n.behaviors})` : ""}`)
      .join("\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: `You review home-care caregiver visit notes for ${group.residentName} to catch slow-developing risk patterns that staff did NOT already flag with an explicit fall/incident checkbox — things like a declining mood trend, recurring missed meals, repeated complaints, or behavioral changes mentioned only in passing across multiple visits.

Respond with EXACTLY "NO CONCERNS" if nothing stands out. Otherwise respond with a single short paragraph (2-3 sentences) describing the pattern you noticed and why it's worth a supervisor's attention. Do not repeat the raw notes back verbatim; synthesize.`,
      messages: [{
        role: "user",
        content: `Recent prior visits (for trend context):\n${priorNotes.join("\n") || "(none on file)"}\n\nToday's new notes:\n${newNotesText}`,
      }],
    });

    const responseText = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    if (responseText && !responseText.toUpperCase().startsWith("NO CONCERNS")) {
      await db.from("alerts").insert({
        facility_id: group.facilityId,
        resident_id: residentId,
        alert_type: "ai_note_risk",
        title: `Possible care pattern flagged — ${group.residentName}`,
        message: responseText,
        due_date: new Date().toISOString().split("T")[0],
      });
      flagged++;
    }
  }

  return NextResponse.json({ success: true, scanned, flagged });
}
