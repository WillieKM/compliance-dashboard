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

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgIdParam = new URL(request.url).searchParams.get("orgId");
  const targetOrgId = orgIdParam && profile.is_super_admin ? orgIdParam : profile.facility_id;

  const db = admin();
  const { data } = await db.from("organizations")
    .select("smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email")
    .eq("id", targetOrgId)
    .maybeSingle();

  if (!data) return NextResponse.json({});

  // Never return the real password to the browser — just whether one is set.
  const { smtp_pass, ...rest } = data;
  return NextResponse.json({ ...rest, smtp_pass_set: !!smtp_pass });
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orgId, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email } = body;
  const isSuperAdminOverride = !!orgId && profile.is_super_admin;
  const targetOrgId = isSuperAdminOverride ? orgId : profile.facility_id;

  const db = admin();

  // Only flip a pending concierge request to "active" — never invent a paid
  // add-on for an org that never requested (and was never billed for) one.
  let markActive = false;
  if (isSuperAdminOverride) {
    const { data: org } = await db.from("organizations")
      .select("email_addon_status").eq("id", targetOrgId).maybeSingle();
    markActive = org?.email_addon_status === "requested";
  }

  const updates: Record<string, unknown> = {
    smtp_host:       smtp_host || null,
    smtp_port:       smtp_port ? Number(smtp_port) : 587,
    smtp_user:       smtp_user || null,
    smtp_from_name:  smtp_from_name || null,
    smtp_from_email: smtp_from_email || null,
    ...(markActive ? { email_addon_status: "active" } : {}),
  };
  // GET never returns the real password, so a blank field here means
  // "unchanged" — only overwrite it when a new value was actually typed.
  if (smtp_pass) updates.smtp_pass = smtp_pass;

  const { error } = await db.from("organizations").update(updates).eq("id", targetOrgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PUT(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  let { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email } = body;
  const { to, orgId } = body;

  if (!to) return NextResponse.json({ error: "Recipient email required" }, { status: 400 });

  // The form never holds the real saved password — if none was typed,
  // fall back to whatever's already stored for this org.
  if (!smtp_pass) {
    const isSuperAdminOverride = !!orgId && profile.is_super_admin;
    const targetOrgId = isSuperAdminOverride ? orgId : profile.facility_id;
    const { data: saved } = await admin().from("organizations")
      .select("smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email")
      .eq("id", targetOrgId)
      .maybeSingle();
    if (saved) {
      smtp_host       = smtp_host || saved.smtp_host;
      smtp_port       = smtp_port || saved.smtp_port;
      smtp_user       = smtp_user || saved.smtp_user;
      smtp_pass       = saved.smtp_pass;
      smtp_from_name  = smtp_from_name || saved.smtp_from_name;
      smtp_from_email = smtp_from_email || saved.smtp_from_email;
    }
  }

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
