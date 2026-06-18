import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = admin();
  const { data } = await db.from("organizations")
    .select("smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email")
    .eq("id", profile.facility_id)
    .maybeSingle();

  return NextResponse.json(data ?? {});
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email } = body;

  const db = admin();
  const { error } = await db.from("organizations").update({
    smtp_host:       smtp_host || null,
    smtp_port:       smtp_port ? Number(smtp_port) : 587,
    smtp_user:       smtp_user || null,
    smtp_pass:       smtp_pass || null,
    smtp_from_name:  smtp_from_name || null,
    smtp_from_email: smtp_from_email || null,
  }).eq("id", profile.facility_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PUT(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { to, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email } = body;

  if (!to) return NextResponse.json({ error: "Recipient email required" }, { status: 400 });

  let transport: nodemailer.Transporter;
  let fromEmail: string;

  if (smtp_host && smtp_user && smtp_pass) {
    const port   = smtp_port ?? 587;
    const secure = port === 465;
    transport = nodemailer.createTransport({
      host:       smtp_host,
      port,
      secure,
      requireTLS: !secure,
      auth:       { user: smtp_user, pass: smtp_pass },
    });
    fromEmail = smtp_from_email ?? smtp_user;
  } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
    fromEmail = process.env.GMAIL_USER;
  } else {
    return NextResponse.json({ error: "No email credentials configured" }, { status: 400 });
  }

  try {
    await transport.sendMail({
      from: `"${smtp_from_name ?? "CareCompliance"}" <${fromEmail}>`,
      to,
      subject: "Test Email — CareCompliance",
      html: `<div style="font-family:sans-serif;padding:20px"><h2>Test Email</h2><p>Your email settings are working correctly!</p></div>`,
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
