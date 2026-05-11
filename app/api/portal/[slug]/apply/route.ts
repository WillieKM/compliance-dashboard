import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await request.json();

  const { firstName, lastName, email, phone, role, previousEmployer,
    yearsExperience, certifications, startDate, availability, notes } = body;

  const db = admin();

  // Get org branding + admin notification email
  const { data: org } = await db.from("organizations")
    .select("id, name, primary_color, logo_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!org) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

  // Send notification email to admin
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const notifyEmail = process.env.NOTIFICATION_EMAIL ?? gmailUser;

  if (gmailUser && gmailPass && notifyEmail) {
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });

    await transport.sendMail({
      from: `"${org.name} Applications" <${gmailUser}>`,
      to: notifyEmail,
      subject: `New Application: ${firstName} ${lastName} — ${role}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:${org.primary_color ?? "#1a3a52"};color:white;padding:20px;border-radius:8px 8px 0 0">
            ${org.logo_url ? `<img src="${org.logo_url}" style="height:40px;width:40px;border-radius:8px;margin-bottom:8px;display:block" />` : ""}
            <h2 style="margin:0">${org.name}</h2>
            <p style="margin:4px 0 0;opacity:0.75">New Staff Application</p>
          </div>
          <div style="background:white;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px;font-weight:bold;color:#64748b">Name</td><td style="padding:8px">${firstName} ${lastName}</td></tr>
              <tr style="background:#f8fafc"><td style="padding:8px;font-weight:bold;color:#64748b">Email</td><td style="padding:8px"><a href="mailto:${email}">${email}</a></td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#64748b">Phone</td><td style="padding:8px">${phone || "—"}</td></tr>
              <tr style="background:#f8fafc"><td style="padding:8px;font-weight:bold;color:#64748b">Role</td><td style="padding:8px">${role}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#64748b">Previous Employer</td><td style="padding:8px">${previousEmployer || "—"}</td></tr>
              <tr style="background:#f8fafc"><td style="padding:8px;font-weight:bold;color:#64748b">Experience</td><td style="padding:8px">${yearsExperience || "—"}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#64748b">Certifications</td><td style="padding:8px">${certifications || "—"}</td></tr>
              <tr style="background:#f8fafc"><td style="padding:8px;font-weight:bold;color:#64748b">Start Date</td><td style="padding:8px">${startDate || "—"}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#64748b">Availability</td><td style="padding:8px">${availability || "—"}</td></tr>
              ${notes ? `<tr style="background:#f8fafc"><td style="padding:8px;font-weight:bold;color:#64748b">Notes</td><td style="padding:8px">${notes}</td></tr>` : ""}
            </table>
            <p style="margin-top:20px;color:#64748b;font-size:12px">Submitted via ${org.name} staff application portal</p>
          </div>
        </div>
      `,
    }).catch(() => {}); // Don't fail if email fails
  }

  return NextResponse.json({ success: true });
}
