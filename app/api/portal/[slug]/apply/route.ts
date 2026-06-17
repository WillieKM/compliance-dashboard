import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Accept multipart/form-data (supports photo upload)
  const formData = await request.formData();

  const firstName        = String(formData.get("firstName") ?? "").trim();
  const lastName         = String(formData.get("lastName") ?? "").trim();
  const email            = String(formData.get("email") ?? "").trim();
  const phone            = String(formData.get("phone") ?? "").trim() || null;
  const role             = String(formData.get("role") ?? "").trim();
  const previousEmployer = String(formData.get("previousEmployer") ?? "").trim() || null;
  const yearsExperience  = String(formData.get("yearsExperience") ?? "").trim() || null;
  const certifications   = String(formData.get("certifications") ?? "").trim() || null;
  const startDate        = String(formData.get("startDate") ?? "").trim() || null;
  const availability     = String(formData.get("availability") ?? "").trim() || null;
  const notes            = String(formData.get("notes") ?? "").trim() || null;
  const photoFile        = formData.get("photo") as File | null;

  const { data: org } = await db.from("organizations")
    .select("id, name, primary_color, logo_url, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email")
    .eq("slug", slug)
    .maybeSingle();

  if (!org) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

  // Upload photo to storage if provided
  let photoUrl: string | null = null;
  if (photoFile && photoFile.size > 0) {
    const safeName = photoFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const filePath = `${org.id}/applicant-photos/${Date.now()}-${safeName}`;
    const { error: uploadErr } = await db.storage.from("documents").upload(filePath, photoFile, { upsert: false });
    if (!uploadErr) {
      const { data: urlData } = db.storage.from("documents").getPublicUrl(filePath);
      photoUrl = urlData.publicUrl;
    }
  }

  // Build application notes blob to store extra fields
  const applicationNotes = [
    yearsExperience     ? `Experience: ${yearsExperience}` : null,
    previousEmployer    ? `Previous Employer: ${previousEmployer}` : null,
    certifications      ? `Certifications: ${certifications}` : null,
    startDate           ? `Available From: ${startDate}` : null,
    availability        ? `Availability: ${availability}` : null,
    notes               ? `Notes: ${notes}` : null,
  ].filter(Boolean).join("\n");

  // Create a pending staff record so admin sees the application in the dashboard
  await db.from("staff").insert({
    facility_id:       org.id,
    first_name:        firstName,
    last_name:         lastName,
    email:             email || null,
    phone,
    role,
    status:            "applicant",
    photo_url:         photoUrl,
    application_notes: applicationNotes || null,
  }).select("id").single();

  // Send notification email to admin
  const notifyEmail = process.env.NOTIFICATION_EMAIL ?? process.env.GMAIL_USER;
  const smtpFrom    = org.smtp_from_email ?? process.env.GMAIL_USER;

  if (notifyEmail && smtpFrom) {
    let transport: nodemailer.Transporter | null = null;

    if (org.smtp_host && org.smtp_user && org.smtp_pass) {
      transport = nodemailer.createTransport({
        host: org.smtp_host,
        port: org.smtp_port ?? 587,
        secure: (org.smtp_port ?? 587) === 465,
        auth: { user: org.smtp_user, pass: org.smtp_pass },
      });
    } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      transport = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      });
    }

    if (transport) {
      const fromLabel = org.smtp_from_name ?? org.name;
      await transport.sendMail({
        from: `"${fromLabel} Applications" <${smtpFrom}>`,
        to:   notifyEmail,
        subject: `New Application: ${firstName} ${lastName} — ${role}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <div style="background:${org.primary_color ?? "#1a3a52"};color:white;padding:20px;border-radius:8px 8px 0 0">
              ${org.logo_url ? `<img src="${org.logo_url}" style="height:40px;width:40px;border-radius:8px;margin-bottom:8px;display:block" />` : ""}
              <h2 style="margin:0">${org.name}</h2>
              <p style="margin:4px 0 0;opacity:0.75">New Staff Application</p>
            </div>
            <div style="background:white;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
              ${photoUrl ? `<div style="text-align:center;margin-bottom:20px"><img src="${photoUrl}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid #e2e8f0" /></div>` : ""}
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
              <p style="margin-top:20px;padding:12px;background:#f0fdf4;border-radius:8px;color:#166534;font-size:13px">
                ✅ This applicant has been saved to your dashboard under <strong>Staff → Pending Applications</strong>. Click their name to review and activate.
              </p>
            </div>
          </div>
        `,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ success: true });
}
