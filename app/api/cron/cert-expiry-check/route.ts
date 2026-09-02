import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// Admin client — created at runtime so env vars are not captured at build time
function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type OrgRow = {
  id: string;
  name: string;
  slug: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_pass: string | null;
  smtp_from_name: string | null;
  smtp_from_email: string | null;
};

function makeTransport(org: OrgRow): nodemailer.Transporter | null {
  if (org.smtp_host && org.smtp_user && org.smtp_pass) {
    const port = org.smtp_port ?? 587;
    return nodemailer.createTransport({
      host:       org.smtp_host,
      port,
      secure:     port === 465,
      requireTLS: port !== 465,
      auth:       { user: org.smtp_user, pass: org.smtp_pass },
    });
  }
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: "gmail",
      auth:    { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return null;
}

function fromAddress(org: OrgRow): string {
  const name  = org.smtp_from_name  ?? org.name;
  const email = org.smtp_from_email ?? org.smtp_user ?? process.env.GMAIL_USER ?? "";
  return `"${name}" <${email}>`;
}

/** Recipient: the agency admin's configured email, with a platform-wide fallback. */
function toAddress(org: OrgRow): string {
  return (
    org.smtp_from_email ??
    org.smtp_user ??
    process.env.NOTIFICATION_EMAIL ??
    process.env.GMAIL_USER ??
    ""
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

  const db = admin();

  // Anchor to midnight UTC so date comparisons are stable throughout the run
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10); // YYYY-MM-DD

  // ── 1. Fetch all staff documents that are expired OR expiring within 30 days ──
  const { data: docs } = await db
    .from("documents")
    .select("id, facility_id, staff_id, file_name, expiration_date")
    .eq("owner_type", "staff")
    .not("expiration_date", "is", null)
    .not("facility_id",     "is", null)
    .lte("expiration_date", cutoffStr);

  if (!docs?.length) {
    return NextResponse.json({ ok: true, checked: 0, emails: 0 });
  }

  // ── 2. Batch-load staff names for all impacted documents ─────────────────────
  const staffIds = [
    ...new Set(docs.map((d) => d.staff_id).filter(Boolean)),
  ] as string[];

  const { data: staffRows } = await db
    .from("staff")
    .select("id, first_name, last_name")
    .in("id", staffIds);

  const staffMap = Object.fromEntries(
    (staffRows ?? []).map((s) => [s.id, s])
  );

  // ── 3. Group documents by facility_id ────────────────────────────────────────
  type DocRow = (typeof docs)[number];
  const byFacility = new Map<string, DocRow[]>();

  for (const doc of docs) {
    if (!doc.facility_id) continue;
    if (!byFacility.has(doc.facility_id)) byFacility.set(doc.facility_id, []);
    byFacility.get(doc.facility_id)!.push(doc);
  }

  // ── 4. Batch-load org SMTP settings for all unique facility IDs ──────────────
  const facilityIds = [...byFacility.keys()];

  const { data: orgs } = await db
    .from("organizations")
    .select(
      "id, name, slug, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email"
    )
    .in("id", facilityIds);

  const orgMap = Object.fromEntries(
    (orgs ?? []).map((o) => [o.id, o as OrgRow])
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  let emailsSent = 0;

  // ── 5. Send one plain-text email per facility ────────────────────────────────
  for (const [facilityId, facilityDocs] of byFacility) {
    const org = orgMap[facilityId];
    if (!org) continue;

    const recipient = toAddress(org);
    if (!recipient) continue;

    const transport = makeTransport(org);
    if (!transport) {
      console.warn(`No SMTP transport for facility ${facilityId} — skipping`);
      continue;
    }

    // Sort: expired (most overdue first) then soonest-expiring
    const sorted = [...facilityDocs].sort(
      (a, b) =>
        new Date(a.expiration_date!).getTime() -
        new Date(b.expiration_date!).getTime()
    );

    let expiredCount  = 0;
    let expiringCount = 0;

    const certLines = sorted.map((doc) => {
      const staff     = staffMap[doc.staff_id ?? ""];
      const staffName = staff
        ? `${staff.first_name} ${staff.last_name}`
        : "Unknown Staff";
      const docName   = doc.file_name ?? "Document";

      const expMs    = new Date(doc.expiration_date!).setUTCHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((expMs - today.getTime()) / 86_400_000);

      if (daysLeft < 0) {
        expiredCount++;
        const overdueDays = Math.abs(daysLeft);
        return (
          `  [EXPIRED ${overdueDays}d ago]  ${staffName} — ${docName}` +
          ` (expired ${doc.expiration_date})`
        );
      }
      if (daysLeft === 0) {
        expiringCount++;
        return `  [EXPIRES TODAY]        ${staffName} — ${docName} (${doc.expiration_date})`;
      }
      expiringCount++;
      return (
        `  [${daysLeft}d remaining]       ${staffName} — ${docName}` +
        ` (expires ${doc.expiration_date})`
      );
    });

    const summary: string[] = [];
    if (expiredCount  > 0) summary.push(`${expiredCount} expired`);
    if (expiringCount > 0) summary.push(`${expiringCount} expiring within 30 days`);

    const body = [
      `Staff Certification Alert — ${org.name}`,
      "=".repeat(54),
      "",
      `Summary: ${summary.join(" · ")}`,
      "",
      ...certLines,
      "",
      "-".repeat(54),
      `Please renew these certifications to maintain compliance.`,
      `Dashboard: ${appUrl}/compliance/personnel`,
      "",
      `This is an automated daily alert from CareCompliance.`,
    ].join("\n");

    try {
      await transport.sendMail({
        from:    fromAddress(org),
        to:      recipient,
        subject: `⚠ Staff Certifications Expiring — ${org.name}`,
        text:    body,
      });
      emailsSent++;
    } catch (e) {
      console.error(`Cert expiry email failed for facility ${facilityId}:`, e);
    }
  }

  return NextResponse.json({ ok: true, checked: docs.length, emails: emailsSent });
}
