import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// Created inside handler so env vars are read at runtime, not build time
function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getDiff(dateStr: string) {
  return Math.ceil(
    (new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) /
      86400000
  );
}

function mailer() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

export async function GET(request: Request) {
  // Vercel's own Cron scheduler sends "Authorization: Bearer <CRON_SECRET>";
  // x-cron-secret is kept for manual/external triggering.
  const isAuthorized =
    request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}` ||
    request.headers.get("x-cron-secret") === process.env.CRON_SECRET;
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = getAdmin();
  const today = new Date().toISOString().split("T")[0];
  let alertsCreated = 0;
  let emailsSent = 0;
  let residentsUpdated = 0;

  // ── 1. Load all documents with expiration dates ──────────────
  const { data: docs } = await supabaseAdmin
    .from("documents")
    .select("id, facility_id, staff_id, resident_id, file_name, expiration_date, owner_type")
    .not("expiration_date", "is", null);

  if (!docs) return NextResponse.json({ message: "No documents found" });

  // ── 2. Process each document ─────────────────────────────────
  for (const doc of docs) {
    const diff = getDiff(doc.expiration_date);
    const isExpired = diff < 0;
    const isExpiring = diff >= 0 && diff <= 30;

    if (!isExpired && !isExpiring) continue;

    const alertType = isExpired ? "expired_document" : "expiring_document";
    const title = isExpired ? "Document Expired" : "Document Expiring Soon";
    const message = isExpired
      ? `${doc.file_name || "Document"} expired on ${doc.expiration_date}`
      : `${doc.file_name || "Document"} expires in ${diff} day${diff === 1 ? "" : "s"} (${doc.expiration_date})`;

    // Check if alert already exists for this doc + type
    const { data: existing } = await supabaseAdmin
      .from("alerts")
      .select("id")
      .eq("document_id", doc.id)
      .eq("alert_type", alertType)
      .eq("resolved", false)
      .maybeSingle();

    if (!existing) {
      await supabaseAdmin.from("alerts").insert({
        facility_id: doc.facility_id,
        resident_id: doc.resident_id ?? null,
        document_id: doc.id,
        alert_type: alertType,
        title,
        message,
        due_date: doc.expiration_date,
      });
      alertsCreated++;
    }

    // ── 3. Email individual staff members ──────────────────────
    if (doc.owner_type === "staff" && doc.staff_id && (diff === 30 || diff === 14 || diff === 7)) {
      const { data: staffMember } = await supabaseAdmin
        .from("staff")
        .select("first_name, last_name, email")
        .eq("id", doc.staff_id)
        .maybeSingle();

      if (staffMember?.email) {
        const transport = mailer();
        if (transport) {
          try {
            const urgency = diff <= 7 ? "🔴 URGENT" : diff <= 14 ? "🟡 ACTION NEEDED" : "📋 REMINDER";
            await transport.sendMail({
              from: `"CareCompliance" <${process.env.GMAIL_USER}>`,
              to: staffMember.email,
              subject: `${urgency}: ${doc.file_name} expires in ${diff} days`,
              html: `
                <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
                  <div style="background:#1a3a52;color:white;padding:20px;border-radius:8px 8px 0 0">
                    <h2 style="margin:0">CareCompliance</h2>
                    <p style="margin:4px 0 0;opacity:0.75;font-size:13px">Certification Expiry Alert</p>
                  </div>
                  <div style="background:white;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
                    <p style="font-size:16px">Hi <strong>${staffMember.first_name}</strong>,</p>
                    <div style="background:${diff <= 7 ? "#fef2f2" : diff <= 14 ? "#fffbeb" : "#eff6ff"};border-left:4px solid ${diff <= 7 ? "#ef4444" : diff <= 14 ? "#f59e0b" : "#3b82f6"};padding:12px 16px;margin:16px 0;border-radius:4px">
                      <p style="margin:0;font-weight:bold">${doc.file_name}</p>
                      <p style="margin:4px 0 0;font-size:14px">Expires: <strong>${doc.expiration_date}</strong> (${diff} days from today)</p>
                    </div>
                    <p>Please renew this document and upload it to your compliance portal before it expires to maintain your compliance status.</p>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/documents/new?owner_type=staff"
                       style="display:inline-block;background:#1a3a52;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">
                      Upload Renewed Document →
                    </a>
                    <p style="margin-top:24px;color:#6b7280;font-size:12px">CareCompliance — automated reminder. If you have questions, contact your agency administrator.</p>
                  </div>
                </div>
              `,
            });
            emailsSent++;
          } catch {
            // Don't fail the whole cron if one email fails
          }
        }
      }
    }
  }

  // ── 4. Auto-update resident compliance status ─────────────────
  const { data: residents } = await supabaseAdmin
    .from("residents")
    .select("id");

  for (const resident of residents ?? []) {
    const { data: residentDocs } = await supabaseAdmin
      .from("documents")
      .select("expiration_date")
      .eq("resident_id", resident.id)
      .not("expiration_date", "is", null);

    let newStatus = "Active";
    for (const d of residentDocs ?? []) {
      const diff = getDiff(d.expiration_date);
      if (diff < 0) { newStatus = "overdue"; break; }
      if (diff <= 30) newStatus = "review";
    }

    await supabaseAdmin
      .from("residents")
      .update({ status: newStatus })
      .eq("id", resident.id);
    residentsUpdated++;
  }

  // ── 5. Email admin summary ────────────────────────────────────
  const adminEmail = process.env.NOTIFICATION_EMAIL;
  const transport = mailer();
  if (adminEmail && transport && alertsCreated > 0) {
    await transport.sendMail({
      from: `"CareCompliance" <${process.env.GMAIL_USER}>`,
      to: adminEmail,
      subject: `Daily Compliance Check — ${today}`,
      html: `
        <h2>Daily Compliance Summary</h2>
        <table style="border-collapse:collapse;font-family:sans-serif">
          <tr><td style="padding:8px;font-weight:bold">New alerts created</td><td style="padding:8px">${alertsCreated}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px;font-weight:bold">Staff reminder emails sent</td><td style="padding:8px">${emailsSent}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Resident statuses updated</td><td style="padding:8px">${residentsUpdated}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px;font-weight:bold">Run date</td><td style="padding:8px">${today}</td></tr>
        </table>
        <p style="margin-top:24px"><a href="${process.env.NEXT_PUBLIC_APP_URL}/alerts">View all alerts →</a></p>
      `,
    });
  }

  return NextResponse.json({
    success: true,
    date: today,
    alertsCreated,
    emailsSent,
    residentsUpdated,
  });
}
