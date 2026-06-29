import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendNewMessageNotificationEmail } from "@/lib/email";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function resolveResident(db: ReturnType<typeof admin>, token: string) {
  const { data } = await db.from("residents")
    .select("id, facility_id, first_name, last_name")
    .eq("family_portal_token", token).maybeSingle();
  return data;
}

// GET /api/family-portal/[token]/messages — family thread with the office
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = admin();
  const resident = await resolveResident(db, token);
  if (!resident) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });

  const { data: messages } = await db.from("messages")
    .select("id, sender_role, sender_name, body, created_at")
    .eq("facility_id", resident.facility_id).eq("channel", "family").eq("resident_id", resident.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ messages: messages ?? [] });
}

// POST /api/family-portal/[token]/messages — family sends a message to the office
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { senderName, body } = await request.json();
  if (!senderName || !body?.trim()) {
    return NextResponse.json({ error: "senderName and body are required" }, { status: 400 });
  }

  const db = admin();
  const resident = await resolveResident(db, token);
  if (!resident) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });

  const { error } = await db.from("messages").insert({
    facility_id: resident.facility_id,
    channel: "family",
    resident_id: resident.id,
    sender_role: "family",
    sender_name: senderName,
    body: body.trim(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: org } = await db.from("organizations")
    .select("name, primary_color, notification_email, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email")
    .eq("id", resident.facility_id).maybeSingle();

  const notifyTo = org?.notification_email ?? process.env.NOTIFICATION_EMAIL;
  if (notifyTo) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    sendNewMessageNotificationEmail({
      to: notifyTo,
      agencyName: org?.name ?? "Your Agency",
      agencyColor: org?.primary_color ?? "#1a3a52",
      senderName,
      senderRole: "family",
      body: body.trim(),
      threadUrl: `${appUrl}/messages?channel=family&id=${resident.id}`,
      smtpConfig: org ?? undefined,
    }).catch(e => console.error("New-message notification failed:", e));
  }

  return NextResponse.json({ ok: true });
}
