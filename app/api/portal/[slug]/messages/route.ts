import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendNewMessageNotificationEmail } from "@/lib/email";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/portal/[slug]/messages?staffId=... — caregiver thread with the office
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get("staffId");
  if (!staffId) return NextResponse.json({ error: "staffId is required" }, { status: 400 });

  const db = admin();
  const { data: org } = await db.from("organizations").select("id").eq("slug", slug).maybeSingle();
  if (!org) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

  const { data: messages } = await db.from("messages")
    .select("id, sender_role, sender_name, body, created_at")
    .eq("facility_id", org.id).eq("channel", "caregiver").eq("staff_id", staffId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ messages: messages ?? [] });
}

// POST /api/portal/[slug]/messages — caregiver sends a message to the office
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { staffId, senderName, body } = await request.json();
  if (!staffId || !senderName || !body?.trim()) {
    return NextResponse.json({ error: "staffId, senderName, and body are required" }, { status: 400 });
  }

  const db = admin();
  const { data: org } = await db.from("organizations")
    .select("id, name, primary_color, notification_email, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email")
    .eq("slug", slug).maybeSingle();
  if (!org) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

  const { error } = await db.from("messages").insert({
    facility_id: org.id,
    channel: "caregiver",
    staff_id: staffId,
    sender_role: "caregiver",
    sender_name: senderName,
    body: body.trim(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const notifyTo = org.notification_email ?? process.env.NOTIFICATION_EMAIL;
  if (notifyTo) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    sendNewMessageNotificationEmail({
      to: notifyTo,
      agencyName: org.name ?? "Your Agency",
      agencyColor: org.primary_color ?? "#1a3a52",
      senderName,
      senderRole: "caregiver",
      body: body.trim(),
      threadUrl: `${appUrl}/messages?channel=caregiver&id=${staffId}`,
      smtpConfig: org,
    }).catch(e => console.error("New-message notification failed:", e));
  }

  return NextResponse.json({ ok: true });
}
