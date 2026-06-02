import nodemailer from "nodemailer";

function fmt12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

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
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("Shift email skipped — GMAIL_USER or GMAIL_APP_PASSWORD not set");
    return;
  }

  const dateLabel = new Date(`${data.shiftDate}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const timeLabel = `${fmt12h(data.startTime)}${data.endTime ? ` – ${fmt12h(data.endTime)}` : ""}`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });

  await transporter.sendMail({
    from: `"${data.agencyName}" <${process.env.GMAIL_USER}>`,
    to: data.to,
    subject: `New Shift: ${data.clientName} · ${dateLabel}`,
    html: buildHtml({ ...data, dateLabel, timeLabel }),
  });
}

function buildHtml(d: ShiftEmailData & { dateLabel: string; timeLabel: string }): string {
  const c = d.agencyColor;
  const row = (label: string, value: string) =>
    `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;width:90px;vertical-align:top;">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:15px;color:#1e293b;font-weight:500;">${value}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.10);">
    <div style="background:${c};padding:28px 32px;color:white;">
      <p style="margin:0 0 6px;font-size:12px;opacity:.65;text-transform:uppercase;letter-spacing:.08em;">${d.agencyName}</p>
      <h1 style="margin:0;font-size:22px;font-weight:700;">New Shift Assigned</h1>
    </div>
    <div style="padding:28px 32px;">
      <p style="margin:0 0 20px;color:#475569;font-size:15px;">Hello <strong>${d.caregiverName}</strong> — you have a new shift assignment. Please review the details and respond.</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row("Date", d.dateLabel)}
        ${row("Time", d.timeLabel)}
        ${row("Client", d.clientName)}
        ${d.clientAddress ? row("Address", `<span style="background:#eff6ff;color:#1d4ed8;padding:4px 10px;border-radius:6px;font-size:14px;">${d.clientAddress}</span>`) : ""}
        ${d.notes ? row("Notes", d.notes) : ""}
      </table>
      <div style="margin-top:28px;text-align:center;">
        <a href="${d.respondUrl}" style="display:inline-block;background:${c};color:white;padding:15px 36px;border-radius:10px;font-weight:700;font-size:16px;text-decoration:none;">View &amp; Respond to Shift →</a>
      </div>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #f1f5f9;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">Sent by ${d.agencyName} · CareCompliance Platform</p>
    </div>
  </div>
</body></html>`;
}
