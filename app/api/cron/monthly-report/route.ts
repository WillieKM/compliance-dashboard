import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getDiff(dateStr: string) {
  return Math.ceil(
    (new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000
  );
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
  const month = new Date().toLocaleString("default", { month: "long", year: "numeric" });

  // Load all orgs and generate a report per org
  const { data: orgs } = await supabaseAdmin.from("organizations").select("id, name");
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("organization_id, facility_id");

  const transport = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      })
    : null;

  if (!transport || !orgs) {
    return NextResponse.json({ error: "Email not configured or no orgs found" }, { status: 500 });
  }

  let reportsSent = 0;

  for (const org of orgs) {
    const orgProfile = profiles?.find((p) => p.organization_id === org.id);
    if (!orgProfile?.facility_id) continue;

    const fid = orgProfile.facility_id;

    const [docsRes, staffRes, residentsRes, alertsRes] = await Promise.all([
      supabaseAdmin.from("documents").select("expiration_date, file_name, owner_type").eq("facility_id", fid),
      supabaseAdmin.from("staff").select("id, first_name, last_name").eq("facility_id", fid),
      supabaseAdmin.from("residents").select("id, first_name, last_name, status").eq("facility_id", fid),
      supabaseAdmin.from("alerts").select("id, resolved, alert_type").eq("facility_id", fid),
    ]);

    const docs = docsRes.data ?? [];
    const staff = staffRes.data ?? [];
    const residents = residentsRes.data ?? [];
    const alerts = alertsRes.data ?? [];

    const expired = docs.filter((d) => d.expiration_date && getDiff(d.expiration_date) < 0);
    const expiring30 = docs.filter((d) => d.expiration_date && getDiff(d.expiration_date) >= 0 && getDiff(d.expiration_date) <= 30);
    const activeAlerts = alerts.filter((a) => !a.resolved);
    const compliantResidents = residents.filter((r) => r.status === "Active" || r.status === "compliant");

    const complianceScore = docs.length > 0
      ? Math.max(0, 100 - expired.length * 15 - expiring30.length * 5)
      : 100;

    // Find admin email — use notification email or look for staff with admin role
    const adminEmail = process.env.NOTIFICATION_EMAIL;
    if (!adminEmail) continue;

    const overdueResidents = residents.filter((r) => r.status === "overdue");
    const reviewResidents = residents.filter((r) => r.status === "review");

    await transport.sendMail({
      from: `"CareCompliance" <${process.env.GMAIL_USER}>`,
      to: adminEmail,
      subject: `${org.name} — Monthly Compliance Report: ${month}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1e40af;color:white;padding:24px;border-radius:8px 8px 0 0">
            <h1 style="margin:0;font-size:24px">${org.name}</h1>
            <p style="margin:4px 0 0;opacity:0.8">Monthly Compliance Report — ${month}</p>
          </div>

          <div style="background:white;padding:24px;border:1px solid #e2e8f0">
            <h2 style="color:#1e293b;margin-top:0">Overall Score</h2>
            <div style="font-size:48px;font-weight:bold;color:${complianceScore >= 90 ? "#16a34a" : complianceScore >= 70 ? "#d97706" : "#dc2626"}">${complianceScore}%</div>

            <table style="width:100%;border-collapse:collapse;margin-top:24px">
              <thead>
                <tr style="background:#f8fafc">
                  <th style="padding:10px;text-align:left;border:1px solid #e2e8f0">Metric</th>
                  <th style="padding:10px;text-align:right;border:1px solid #e2e8f0">Count</th>
                  <th style="padding:10px;text-align:right;border:1px solid #e2e8f0">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style="padding:10px;border:1px solid #e2e8f0">Total Staff</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0">${staff.length}</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0">—</td></tr>
                <tr style="background:#f8fafc"><td style="padding:10px;border:1px solid #e2e8f0">Total Residents</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0">${residents.length}</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0">—</td></tr>
                <tr><td style="padding:10px;border:1px solid #e2e8f0">Compliant Residents</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0">${compliantResidents.length}</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0;color:#16a34a">✓</td></tr>
                <tr style="background:#f8fafc"><td style="padding:10px;border:1px solid #e2e8f0">Residents Needing Review</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0">${reviewResidents.length}</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0;color:#d97706">⚠</td></tr>
                <tr><td style="padding:10px;border:1px solid #e2e8f0">Overdue Residents</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0">${overdueResidents.length}</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0;color:#dc2626">✕</td></tr>
                <tr style="background:#f8fafc"><td style="padding:10px;border:1px solid #e2e8f0">Expired Documents</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0">${expired.length}</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0;color:#dc2626">${expired.length > 0 ? "Action needed" : "✓"}</td></tr>
                <tr><td style="padding:10px;border:1px solid #e2e8f0">Expiring in 30 Days</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0">${expiring30.length}</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0;color:#d97706">${expiring30.length > 0 ? "Renew soon" : "✓"}</td></tr>
                <tr style="background:#f8fafc"><td style="padding:10px;border:1px solid #e2e8f0">Active Alerts</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0">${activeAlerts.length}</td><td style="padding:10px;text-align:right;border:1px solid #e2e8f0;color:${activeAlerts.length > 0 ? "#d97706" : "#16a34a"}">${activeAlerts.length > 0 ? "Review" : "✓"}</td></tr>
              </tbody>
            </table>

            ${expired.length > 0 ? `
            <h3 style="color:#dc2626;margin-top:24px">Expired Documents Requiring Action</h3>
            <ul style="color:#7f1d1d">
              ${expired.slice(0, 10).map((d) => `<li>${d.file_name || "Untitled"} — expired ${d.expiration_date}</li>`).join("")}
              ${expired.length > 10 ? `<li>...and ${expired.length - 10} more</li>` : ""}
            </ul>` : ""}

            <div style="margin-top:24px;padding:16px;background:#eff6ff;border-radius:8px">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="color:#1e40af;font-weight:bold">
                Open Compliance Dashboard →
              </a>
            </div>
          </div>

          <div style="padding:16px;text-align:center;color:#94a3b8;font-size:12px">
            CareCompliance — automated monthly report
          </div>
        </div>
      `,
    });

    reportsSent++;
  }

  return NextResponse.json({ success: true, month, reportsSent });
}
