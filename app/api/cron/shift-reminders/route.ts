import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendClockInReminderEmail, sendClockOutReminderEmail } from "@/lib/email";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export async function GET(request: Request) {
  const isAuthorized =
    request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}` ||
    request.headers.get("x-cron-secret") === process.env.CRON_SECRET;
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = admin();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let clockInSent = 0;
  let clockOutSent = 0;

  const { data: shifts } = await db
    .from("shifts")
    .select(`
      id, start_time, end_time, status, facility_id,
      clock_in_reminder_sent, clock_out_reminder_sent,
      staff(first_name, last_name, email),
      residents(first_name, last_name, address)
    `)
    .eq("shift_date", todayStr)
    .eq("status", "accepted");

  if (!shifts?.length) {
    return NextResponse.json({ ok: true, date: todayStr, clockInSent, clockOutSent });
  }

  // Batch-load orgs for all unique facility IDs
  const facilityIds = [...new Set(shifts.map(s => s.facility_id).filter(Boolean))];
  const { data: orgs } = await db
    .from("organizations")
    .select("id, name, slug, primary_color, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email")
    .in("id", facilityIds);
  const orgMap = Object.fromEntries((orgs ?? []).map(o => [o.id, o]));

  for (const shift of shifts) {
    const org     = orgMap[shift.facility_id] ?? null;
    const staff   = shift.staff as unknown as { first_name: string; last_name: string; email: string | null } | null;
    const resident = shift.residents as unknown as { first_name: string; last_name: string; address: string | null } | null;

    if (!staff?.email || !org?.slug) continue;

    const caregiverName = `${staff.first_name} ${staff.last_name}`;
    const clientName    = resident ? `${resident.first_name} ${resident.last_name}` : "your client";
    const clockInUrl    = `${appUrl}/portal/${org.slug}/shift/${shift.id}`;

    // Clock-in reminder: 15–45 min before start
    if (!shift.clock_in_reminder_sent && shift.start_time) {
      const startMinutes = timeToMinutes(shift.start_time);
      const minutesUntilStart = startMinutes - nowMinutes;

      if (minutesUntilStart >= 15 && minutesUntilStart <= 45) {
        try {
          await sendClockInReminderEmail({
            to:            staff.email,
            caregiverName,
            agencyName:    org.name,
            agencyColor:   org.primary_color ?? "#1a3a52",
            clientName,
            clientAddress: resident?.address ?? null,
            shiftTime:     shift.start_time.slice(0, 5),
            clockInUrl,
            smtpConfig:    org ?? undefined,
          });
          await db.from("shifts").update({ clock_in_reminder_sent: true }).eq("id", shift.id);
          clockInSent++;
        } catch (e) {
          console.error(`Clock-in reminder failed for shift ${shift.id}:`, e);
        }
      }
    }

    // Clock-out reminder: within 30 min after end_time, only if no completed visit
    if (!shift.clock_out_reminder_sent && shift.end_time) {
      const endMinutes = timeToMinutes(shift.end_time);
      const minutesPastEnd = nowMinutes - endMinutes;

      if (minutesPastEnd >= 0 && minutesPastEnd <= 30) {
        const { data: completedVisit } = await db
          .from("care_visits")
          .select("id")
          .eq("shift_id", shift.id)
          .eq("status", "completed")
          .maybeSingle();

        if (!completedVisit) {
          try {
            await sendClockOutReminderEmail({
              to:            staff.email,
              caregiverName,
              agencyName:    org.name,
              agencyColor:   org.primary_color ?? "#1a3a52",
              clientName,
              shiftTime:     shift.end_time.slice(0, 5),
              clockInUrl,
              smtpConfig:    org ?? undefined,
            });
            await db.from("shifts").update({ clock_out_reminder_sent: true }).eq("id", shift.id);
            clockOutSent++;
          } catch (e) {
            console.error(`Clock-out reminder failed for shift ${shift.id}:`, e);
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true, date: todayStr, clockInSent, clockOutSent });
}
