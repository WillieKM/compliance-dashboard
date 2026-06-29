import { createClient } from "@supabase/supabase-js";
import { distanceMiles } from "@/lib/distance";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type ScoredStaff = {
  id: string;
  name: string;
  role: string | null;
  score: number;
  reasons: string[];
};

function timeOverlaps(aStart?: string | null, aEnd?: string | null, bStart?: string | null, bEnd?: string | null) {
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart < bEnd && bStart < aEnd;
}

// Ranks active staff for a prospective shift: skill match + continuity with
// this client + availability, with conflicted (double-booked) staff hard-
// filtered out rather than just down-ranked.
export async function rankCaregivers(opts: {
  facilityId: string;
  residentId?: string | null;
  careType: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
}): Promise<{ available: ScoredStaff[]; conflictedCount: number }> {
  const { facilityId, residentId, careType, date, startTime, endTime } = opts;
  const db = admin();
  const dayOfWeek = new Date(`${date}T12:00:00`).getDay();

  const [{ data: staffList }, { data: schedulesOnDate }, { data: availability }, { data: pastSchedules }, { data: resident }] = await Promise.all([
    db.from("staff").select("id, first_name, last_name, role, skills, lat, lng").eq("facility_id", facilityId).eq("status", "active"),
    db.from("schedules").select("staff_id, start_time, end_time").eq("facility_id", facilityId).eq("scheduled_date", date).neq("status", "cancelled"),
    db.from("staff_availability").select("staff_id, start_time, end_time").eq("facility_id", facilityId).eq("day_of_week", dayOfWeek),
    residentId
      ? db.from("schedules").select("staff_id").eq("facility_id", facilityId).eq("resident_id", residentId)
      : Promise.resolve({ data: [] as { staff_id: string | null }[] }),
    residentId
      ? db.from("residents").select("lat, lng").eq("id", residentId).maybeSingle()
      : Promise.resolve({ data: null as { lat: number; lng: number } | null }),
  ]);

  const conflictedIds = new Set(
    (schedulesOnDate ?? [])
      .filter(s => s.staff_id && timeOverlaps(startTime, endTime, s.start_time, s.end_time))
      .map(s => s.staff_id as string)
  );

  const continuityIds = new Set((pastSchedules ?? []).map(s => s.staff_id).filter(Boolean) as string[]);

  const availabilityByStaff = new Map<string, { start: string; end: string }[]>();
  for (const a of availability ?? []) {
    if (!a.staff_id) continue;
    const list = availabilityByStaff.get(a.staff_id) ?? [];
    list.push({ start: a.start_time, end: a.end_time });
    availabilityByStaff.set(a.staff_id, list);
  }

  const scored: (ScoredStaff & { conflicted: boolean })[] = (staffList ?? []).map(s => {
    const reasons: string[] = [];
    let score = 0;

    const skills = (s.skills ?? []) as string[];
    if (skills.includes(careType)) { score += 3; reasons.push("Skill match"); }
    if (continuityIds.has(s.id)) { score += 2; reasons.push("Worked with client before"); }

    const windows = availabilityByStaff.get(s.id);
    if (windows && windows.length > 0) {
      const fits = windows.some(w => !startTime || !endTime || (startTime >= w.start && endTime <= w.end));
      if (fits) { score += 2; reasons.push("Available"); }
    }

    if (resident?.lat && resident?.lng && s.lat && s.lng) {
      const miles = distanceMiles(s.lat, s.lng, resident.lat, resident.lng);
      if (miles < 2) score += 2;
      else if (miles < 5) score += 1;
      reasons.push(`${miles.toFixed(1)} mi away`);
    }

    return {
      id: s.id,
      name: `${s.first_name} ${s.last_name}`,
      role: s.role,
      score,
      reasons,
      conflicted: conflictedIds.has(s.id),
    };
  });

  const available = scored.filter(s => !s.conflicted).sort((a, b) => b.score - a.score)
    .map(({ conflicted, ...rest }) => rest);
  const conflictedCount = scored.length - available.length;

  return { available, conflictedCount };
}
