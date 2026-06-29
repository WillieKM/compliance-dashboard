import nodemailer from "nodemailer";

export type SmtpConfig = {
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_user?: string | null;
  smtp_pass?: string | null;
  smtp_from_name?: string | null;
  smtp_from_email?: string | null;
};

function fmt12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function createMailer(smtpConfig?: SmtpConfig): nodemailer.Transporter | null {
  if (smtpConfig?.smtp_host && smtpConfig.smtp_user && smtpConfig.smtp_pass) {
    const port   = smtpConfig.smtp_port ?? 587;
    const secure = port === 465;
    return nodemailer.createTransport({
      host:       smtpConfig.smtp_host,
      port,
      secure,
      requireTLS: !secure,
      auth:       { user: smtpConfig.smtp_user, pass: smtpConfig.smtp_pass },
    });
  }
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return null;
}

function getFromAddress(agencyName: string, smtpConfig?: SmtpConfig): string {
  const fromName  = smtpConfig?.smtp_from_name ?? agencyName;
  const fromEmail = smtpConfig?.smtp_from_email ?? smtpConfig?.smtp_user ?? process.env.GMAIL_USER ?? "";
  return `"${fromName}" <${fromEmail}>`;
}

function send(to: string, subject: string, html: string, from: string, smtpConfig?: SmtpConfig) {
  const t = createMailer(smtpConfig);
  if (!t) { console.warn("Email skipped — no SMTP credentials configured"); return Promise.resolve(); }
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
  smtpConfig?: SmtpConfig;
}

export async function sendShiftAssignmentEmail(data: ShiftEmailData) {
  const dateLabel = new Date(`${data.shiftDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeLabel = `${fmt12h(data.startTime)}${data.endTime ? ` – ${fmt12h(data.endTime)}` : ""}`;
  const from = getFromAddress(data.agencyName, data.smtpConfig);
  await send(data.to, `New Shift: ${data.clientName} · ${dateLabel}`, buildShiftHtml({ ...data, dateLabel, timeLabel }), from, data.smtpConfig);
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
  smtpConfig?: SmtpConfig;
}) {
  const from = getFromAddress(opts.agencyName, opts.smtpConfig);
  await send(opts.to, `⏰ Reminder: Clock in for your shift at ${opts.shiftTime}`,
    wrap(opts.agencyColor, opts.agencyName, "Clock-In Reminder",
      `<p style="font-size:16px;color:#475569;">Hi <strong>${opts.caregiverName}</strong>,</p>
       <p style="font-size:15px;color:#475569;">Your shift starts at <strong>${opts.shiftTime}</strong>. Don't forget to clock in!</p>
       ${opts.clientAddress ? `<div style="background:#eff6ff;border-radius:10px;padding:14px 18px;margin:16px 0;"><p style="margin:0;font-size:13px;font-weight:600;color:#1d4ed8;">📍 Clock in at this address</p><p style="margin:6px 0 0;font-size:15px;color:#1e293b;font-weight:600;">${opts.clientAddress}</p></div>` : ""}
       <div style="margin-top:24px;text-align:center;"><a href="${opts.clockInUrl}" style="display:inline-block;background:${opts.agencyColor};color:white;padding:15px 36px;border-radius:10px;font-weight:700;font-size:16px;text-decoration:none;">🟢 Go to Clock-In →</a></div>`
    ), from, opts.smtpConfig);
}

export async function sendClockOutReminderEmail(opts: {
  to: string; caregiverName: string; agencyName: string; agencyColor: string;
  clientName: string; shiftTime: string; clockInUrl: string;
  smtpConfig?: SmtpConfig;
}) {
  const from = getFromAddress(opts.agencyName, opts.smtpConfig);
  await send(opts.to, `⏰ Reminder: Don't forget to clock out`,
    wrap(opts.agencyColor, opts.agencyName, "Clock-Out Reminder",
      `<p style="font-size:16px;color:#475569;">Hi <strong>${opts.caregiverName}</strong>,</p>
       <p style="font-size:15px;color:#475569;">Your shift for <strong>${opts.clientName}</strong> ended at <strong>${opts.shiftTime}</strong>. Please clock out and submit your service report.</p>
       <div style="margin-top:24px;text-align:center;"><a href="${opts.clockInUrl}" style="display:inline-block;background:#dc2626;color:white;padding:15px 36px;border-radius:10px;font-weight:700;font-size:16px;text-decoration:none;">🔴 Clock Out Now →</a></div>
       <p style="text-align:center;margin-top:12px;font-size:13px;color:#94a3b8;">Clocking out accurately ensures you are paid correctly for your time.</p>`
    ), from, opts.smtpConfig);
}

// ─── Staff Onboarding ─────────────────────────────────────────────────────────

export async function sendStaffOnboardingEmail(opts: {
  to: string; staffName: string; agencyName: string; agencyColor: string; uploadUrl: string;
  smtpConfig?: SmtpConfig;
}) {
  const from = getFromAddress(opts.agencyName, opts.smtpConfig);
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
    ), from, opts.smtpConfig);
}

// ─── Welcome Letter ───────────────────────────────────────────────────────────

export async function sendWelcomeLetterEmail(opts: {
  to: string;
  staffName: string;
  agencyName: string;
  agencyColor: string;
  taxWithholding: string;
  signingUrl: string;
  smtpConfig?: SmtpConfig;
}) {
  const from    = getFromAddress(opts.agencyName, opts.smtpConfig);
  const is1099  = opts.taxWithholding === "1099";
  const taxBox  = is1099
    ? `<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:14px 18px;margin:16px 0;">
         <p style="margin:0;font-size:13px;font-weight:700;color:#92400e;">Tax Status: 1099 Independent Contractor</p>
         <ul style="margin:8px 0 0;padding-left:18px;font-size:13px;color:#78350f;line-height:1.7;">
           <li>No taxes will be withheld from your payments.</li>
           <li>You are responsible for paying all income taxes, including self-employment tax.</li>
           <li>You may need to make estimated quarterly tax payments.</li>
           <li>You will receive a Form 1099-NEC if payments reach $600 or more.</li>
         </ul>
       </div>`
    : `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;margin:16px 0;">
         <p style="margin:0;font-size:13px;font-weight:700;color:#166534;">Tax Status: W-2 Employee</p>
         <ul style="margin:8px 0 0;padding-left:18px;font-size:13px;color:#15803d;line-height:1.7;">
           <li>Federal, state, and local taxes will be withheld from each paycheck.</li>
           <li>You will receive a W-2 at year end.</li>
           <li>The agency matches your Social Security and Medicare contributions.</li>
         </ul>
       </div>`;

  await send(
    opts.to,
    `Action Required: Review & Sign Your Welcome Letter — ${opts.agencyName}`,
    wrap(opts.agencyColor, opts.agencyName, "Your Welcome Letter is Ready",
      `<p style="font-size:16px;color:#475569;">Hi <strong>${opts.staffName}</strong>,</p>
       <p style="font-size:15px;color:#475569;">Welcome to <strong>${opts.agencyName}</strong>! Please review your employment terms below and sign your welcome letter online.</p>
       ${taxBox}
       <p style="font-size:14px;color:#475569;">By signing, you confirm you have read and understood your employment arrangement, including your tax obligations.</p>
       <div style="margin-top:24px;text-align:center;">
         <a href="${opts.signingUrl}" style="display:inline-block;background:${opts.agencyColor};color:white;padding:16px 40px;border-radius:10px;font-weight:700;font-size:17px;text-decoration:none;">✍️ Sign My Welcome Letter →</a>
       </div>
       <p style="text-align:center;margin-top:10px;font-size:12px;color:#94a3b8;">Works on any device — phone, tablet, or computer. No login required.</p>`
    ),
    from,
    opts.smtpConfig,
  );
}

// ─── Signed Letter Copy ───────────────────────────────────────────────────────

export async function sendSignedLetterEmail(opts: {
  to: string;
  staffName: string;
  agencyName: string;
  agencyColor: string;
  taxWithholding: string;
  hireDate: string;
  signatureUrl: string;
  signedAt: string;
  adminSignatureUrl?: string | null;
  adminSignedAt?: string | null;
  smtpConfig?: SmtpConfig;
}) {
  const from     = getFromAddress(opts.agencyName, opts.smtpConfig);
  const is1099   = opts.taxWithholding === "1099";
  const dateFmt  = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const taxSection = is1099
    ? `<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:14px 18px;margin:16px 0;">
         <p style="margin:0;font-size:13px;font-weight:700;color:#92400e;">Tax Status: 1099 Independent Contractor</p>
         <ul style="margin:8px 0 0;padding-left:18px;font-size:13px;color:#78350f;line-height:1.8;">
           <li>No taxes withheld — you are responsible for all income and self-employment taxes.</li>
           <li>You will receive Form 1099-NEC if payments reach $600 or more.</li>
         </ul>
       </div>`
    : `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;margin:16px 0;">
         <p style="margin:0;font-size:13px;font-weight:700;color:#166534;">Tax Status: W-2 Employee</p>
         <ul style="margin:8px 0 0;padding-left:18px;font-size:13px;color:#15803d;line-height:1.8;">
           <li>Federal, state, and local taxes withheld each paycheck.</li>
           <li>W-2 issued at year end. Agency matches FICA contributions.</li>
         </ul>
       </div>`;

  const adminSig = opts.adminSignatureUrl
    ? `<tr>
         <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:12px;color:#94a3b8;width:130px;vertical-align:top;">Agency Signature</td>
         <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
           <img src="${opts.adminSignatureUrl}" alt="Agency Signature" style="max-height:48px;display:block;" />
           <p style="margin:3px 0 0;font-size:11px;color:#94a3b8;">Signed ${opts.adminSignedAt ? dateFmt(opts.adminSignedAt) : ""}</p>
         </td>
       </tr>`
    : "";

  await send(
    opts.to,
    `Your Signed Welcome Letter — ${opts.agencyName}`,
    wrap(opts.agencyColor, opts.agencyName, "Signed Welcome Letter — Your Copy",
      `<p style="font-size:15px;color:#475569;">Hi <strong>${opts.staffName}</strong> — here is your fully signed welcome letter for your records.</p>
       <table style="width:100%;border-collapse:collapse;margin:16px 0;">
         <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:12px;color:#94a3b8;width:130px;">Issued</td>
           <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:15px;color:#1e293b;">${dateFmt(opts.hireDate)}</td></tr>
         <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:12px;color:#94a3b8;">Employee</td>
           <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:15px;color:#1e293b;">${opts.staffName}</td></tr>
       </table>
       ${taxSection}
       <table style="width:100%;border-collapse:collapse;margin-top:8px;">
         <tr>
           <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:12px;color:#94a3b8;width:130px;vertical-align:top;">Employee Signature</td>
           <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
             <img src="${opts.signatureUrl}" alt="Employee Signature" style="max-height:48px;display:block;" />
             <p style="margin:3px 0 0;font-size:11px;color:#94a3b8;">Signed ${dateFmt(opts.signedAt)}</p>
           </td>
         </tr>
         ${adminSig}
       </table>
       <p style="margin-top:16px;font-size:13px;color:#94a3b8;">Please save this email for your records. This letter was signed electronically and is legally binding.</p>`
    ),
    from,
    opts.smtpConfig,
  );
}

// ─── Admin: Documents Complete ────────────────────────────────────────────────

export async function sendDocumentsCompleteEmail(opts: {
  to: string;
  staffName: string;
  agencyName: string;
  agencyColor: string;
  uploadedDocs: { name: string }[];
  profileUrl: string;
  smtpConfig?: SmtpConfig;
}) {
  const from = getFromAddress(opts.agencyName, opts.smtpConfig);
  const docList = opts.uploadedDocs
    .map(d => `<li style="padding:3px 0;font-size:14px;color:#1e293b;">${d.name}</li>`)
    .join("");

  await send(
    opts.to,
    `📎 ${opts.staffName} has finished uploading documents — ${opts.agencyName}`,
    wrap(opts.agencyColor, opts.agencyName, `${opts.staffName} Uploaded Their Documents`,
      `<p style="font-size:15px;color:#475569;"><strong>${opts.staffName}</strong> has completed their document upload and marked it as done.</p>
       ${docList ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;margin:16px 0;">
         <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:.05em;">Documents uploaded</p>
         <ul style="margin:0;padding-left:18px;">${docList}</ul>
       </div>` : ""}
       <p style="font-size:14px;color:#475569;">Please review their profile to verify the documents meet your requirements.</p>
       <div style="margin-top:24px;text-align:center;">
         <a href="${opts.profileUrl}" style="display:inline-block;background:${opts.agencyColor};color:white;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">View Staff Profile →</a>
       </div>`
    ),
    from,
    opts.smtpConfig,
  );
}

// ─── New Message Notification ──────────────────────────────────────────────────

export async function sendNewMessageNotificationEmail(opts: {
  to: string;
  agencyName: string;
  agencyColor: string;
  senderName: string;
  senderRole: "caregiver" | "family";
  body: string;
  threadUrl: string;
  smtpConfig?: SmtpConfig;
}) {
  const from = getFromAddress(opts.agencyName, opts.smtpConfig);
  const roleLabel = opts.senderRole === "caregiver" ? "a caregiver" : "a family member";

  await send(
    opts.to,
    `💬 New message from ${opts.senderName} — ${opts.agencyName}`,
    wrap(opts.agencyColor, opts.agencyName, "New Message",
      `<p style="font-size:15px;color:#475569;"><strong>${opts.senderName}</strong> (${roleLabel}) sent a new message:</p>
       <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;margin:16px 0;">
         <p style="margin:0;font-size:14px;color:#1e293b;white-space:pre-wrap;">${opts.body}</p>
       </div>
       <div style="margin-top:24px;text-align:center;">
         <a href="${opts.threadUrl}" style="display:inline-block;background:${opts.agencyColor};color:white;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">Reply →</a>
       </div>`
    ),
    from,
    opts.smtpConfig,
  );
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
