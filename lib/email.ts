import nodemailer from "nodemailer";

function fmt12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function mailer() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
}

function send(to: string, subject: string, html: string, from: string) {
  const t = mailer();
  if (!t) { console.warn("Email skipped — GMAIL_USER / GMAIL_APP_PASSWORD not set"); return Promise.resolve(); }
  return t.sendMail({ from, to, subject, html });
}

// ─── Shift Assignment ──────────────────────────────────────────────────────────

export interface ShiftEmailData {
  to: string;
  caregiverName: string;
  agencyName: string;
  agencyColor: string;
  shiftDate: string;
  startTime: string;
  endTime?: string | null;
  clientName: string;
  clientAddress?: string | null;
  notes?: string | null;
  respondUrl: string;
}

export async function sendShiftAssignmentEmail(data: ShiftEmailData) {
  const dateLabel = new Date(`${data.shiftDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeLabel = `${fmt12h(data.startTime)}${data.endTime ? ` – ${fmt12h(data.endTime)}` : ""}`;
  const from = `"${data.agencyName}" <${process.env.GMAIL_USER}>`;
  await send(data.to, `New Shift: ${data.clientName} · ${dateLabel}`, buildShiftHtml({ ...data, dateLabel, timeLabel }), from);
}

function buildShiftHtml(d: ShiftEmailData & { dateLabel: string; timeLabel: string }): string {
  const c = d.agencyColor;
  const row = (label: string, value: string) =>
    `<tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;width:90px;vertical-align:top;">${label}</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:15px;color:#1e293b;font-weight:500;">${value}</td></tr>`;
  return wrap(c, d.agencyName, "New Shift Assigned",
    `<p style="margin:0 0 20px;color:#475569;font-size:15px;">Hello <strong>${d.caregiverName}</strong> — you have a new shift assignment.</p>
     <table style="width:100%;border-collapse:collapse;">
       ${row("Date", d.dateLabel)}${row("Time", d.timeLabel)}${row("Client", d.clientName)}
       ${d.clientAddress ? row("Address", `<span style="background:#eff6ff;color:#1d4ed8;padding:4px 10px;border-radius:6px;font-size:14px;">${d.clientAddress}</span>`) : ""}
       ${d.notes ? row("Notes", d.notes) : ""}
     </table>
     <div style="margin-top:28px;text-align:center;"><a href="${d.respondUrl}" style="display:inline-block;background:${c};color:white;padding:15px 36px;border-radius:10px;font-weight:700;font-size:16px;text-decoration:none;">View &amp; Respond to Shift →</a></div>`
  );
}

// ─── Shift Reminders ───────────────────────────────────────────────────────────

export async function sendClockInReminderEmail(opts: {
  to: string; caregiverName: string; agencyName: string; agencyColor: string;
  clientName: string; clientAddress: string | null; shiftTime: string; clockInUrl: string;
}) {
  const from = `"${opts.agencyName}" <${process.env.GMAIL_USER}>`;
  await send(opts.to, `⏰ Reminder: Clock in for your shift at ${opts.shiftTime}`,
    wrap(opts.agencyColor, opts.agencyName, "Clock-In Reminder",
      `<p style="font-size:16px;color:#475569;">Hi <strong>${opts.caregiverName}</strong>,</p>
       <p style="font-size:15px;color:#475569;">Your shift starts at <strong>${opts.shiftTime}</strong>. Don't forget to clock in!</p>
       ${opts.clientAddress ? `<div style="background:#eff6ff;border-radius:10px;padding:14px 18px;margin:16px 0;"><p style="margin:0;font-size:13px;font-weight:600;color:#1d4ed8;">📍 Clock in at this address</p><p style="margin:6px 0 0;font-size:15px;color:#1e293b;font-weight:600;">${opts.clientAddress}</p></div>` : ""}
       <div style="margin-top:24px;text-align:center;"><a href="${opts.clockInUrl}" style="display:inline-block;background:${opts.agencyColor};color:white;padding:15px 36px;border-radius:10px;font-weight:700;font-size:16px;text-decoration:none;">🟢 Go to Clock-In →</a></div>`
    ), from);
}

export async function sendClockOutReminderEmail(opts: {
  to: string; caregiverName: string; agencyName: string; agencyColor: string;
  clientName: string; shiftTime: string; clockInUrl: string;
}) {
  const from = `"${opts.agencyName}" <${process.env.GMAIL_USER}>`;
  await send(opts.to, `⏰ Reminder: Don't forget to clock out`,
    wrap(opts.agencyColor, opts.agencyName, "Clock-Out Reminder",
      `<p style="font-size:16px;color:#475569;">Hi <strong>${opts.caregiverName}</strong>,</p>
       <p style="font-size:15px;color:#475569;">Your shift for <strong>${opts.clientName}</strong> ended at <strong>${opts.shiftTime}</strong>. Please clock out and submit your service report.</p>
       <div style="margin-top:24px;text-align:center;"><a href="${opts.clockInUrl}" style="display:inline-block;background:#dc2626;color:white;padding:15px 36px;border-radius:10px;font-weight:700;font-size:16px;text-decoration:none;">🔴 Clock Out Now →</a></div>
       <p style="text-align:center;margin-top:12px;font-size:13px;color:#94a3b8;">Clocking out accurately ensures you are paid correctly for your time.</p>`
    ), from);
}

// ─── Staff Onboarding ─────────────────────────────────────────────────────────

export async function sendStaffOnboardingEmail(opts: {
  to: string; staffName: string; agencyName: string; agencyColor: string; uploadUrl: string;
}) {
  const from = `"${opts.agencyName}" <${process.env.GMAIL_USER}>`;
  await send(opts.to, `Action Required: Upload Your Documents — ${opts.agencyName}`,
    wrap(opts.agencyColor, opts.agencyName, "Welcome — Please Upload Your Documents",
      `<p style="font-size:16px;color:#475569;">Hi <strong>${opts.staffName}</strong>,</p>
       <p style="font-size:15px;color:#475569;">Welcome to <strong>${opts.agencyName}</strong>! Before your first shift, please upload your required documents using the secure link below.</p>
       <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin:20px 0;">
         <p style="margin:0;font-size:14px;font-weight:600;color:#166534;">Documents typically required:</p>
         <ul style="margin:8px 0 0;padding-left:20px;font-size:14px;color:#15803d;line-height:1.8;">
           <li>Government-issued photo ID / Driver's License</li>
           <li>Social Security Card</li>
           <li>TB Test Results</li>
           <li>CPR / First Aid Certificate</li>
           <li>Home Care Aide (HCA) Certificate</li>
           <li>Background Check Authorization</li>
           <li>Any other certifications</li>
         </ul>
       </div>
       <p style="font-size:14px;color:#64748b;">The upload link is unique to you — no account or login required. You can return to it anytime to upload additional documents.</p>
       <div style="margin-top:24px;text-align:center;"><a href="${opts.uploadUrl}" style="display:inline-block;background:${opts.agencyColor};color:white;padding:15px 36px;border-radius:10px;font-weight:700;font-size:16px;text-decoration:none;">📎 Upload My Documents →</a></div>
       <p style="text-align:center;margin-top:12px;font-size:12px;color:#94a3b8;">This link is unique to you. Do not share it with others.</p>`
    ), from);
}

// ─── Shared HTML wrapper ──────────────────────────────────────────────────────

function wrap(color: string, agency: string, title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.10);">
    <div style="background:${color};padding:28px 32px;color:white;">
      <p style="margin:0 0 6px;font-size:12px;opacity:.65;text-transform:uppercase;letter-spacing:.08em;">${agency}</p>
      <h1 style="margin:0;font-size:22px;font-weight:700;">${title}</h1>
    </div>
    <div style="padding:28px 32px;">${body}</div>
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #f1f5f9;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">Sent by ${agency} · CareCompliance Platform</p>
    </div>
  </div>
</body></html>`;
}
