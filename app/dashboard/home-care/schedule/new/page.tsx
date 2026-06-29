import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { createClient as admin } from "@supabase/supabase-js";
import ShiftForm from "./ShiftForm";

export const dynamic = "force-dynamic";
const navy = "#1a3a52";

function adminClient() {
  return admin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export default async function NewShiftPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const [{ data: staff }, { data: residents }] = await Promise.all([
    supabase.from("staff").select("id, first_name, last_name, role").eq("facility_id", profile.facility_id).order("first_name"),
    supabase.from("residents").select("id, first_name, last_name").eq("facility_id", profile.facility_id).order("first_name"),
  ]);

  async function saveShift(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;

    const staffId    = String(formData.get("staff_id") || "");
    const residentId = String(formData.get("resident_id") || "");

    const staffList  = staff ?? [];
    const resList    = residents ?? [];
    const staffMember = staffList.find(s => s.id === staffId);
    const resident    = resList.find(r => r.id === residentId);

    const scheduledDate = String(formData.get("scheduled_date") || "");
    const recurrence    = String(formData.get("recurrence") || "none");
    const datesToCreate = [scheduledDate];

    // Handle recurrence — create up to 4 weeks
    if (recurrence !== "none" && scheduledDate) {
      const base = new Date(scheduledDate);
      const step = recurrence === "daily" ? 1 : recurrence === "weekly" ? 7 : 14;
      for (let i = 1; i <= (recurrence === "daily" ? 6 : 3); i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + step * i);
        datesToCreate.push(d.toISOString().split("T")[0]);
      }
    }

    const rows = datesToCreate.map(date => ({
      facility_id:    p.facility_id,
      staff_id:       staffId || null,
      resident_id:    residentId || null,
      caregiver_name: staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : String(formData.get("caregiver_name") || ""),
      client_name:    resident ? `${resident.first_name} ${resident.last_name}` : String(formData.get("client_name") || ""),
      scheduled_date: date,
      start_time:     String(formData.get("start_time") || "") || null,
      end_time:       String(formData.get("end_time") || "") || null,
      care_type:      String(formData.get("care_type") || "home_care_visit"),
      recurrence,
      notes:          String(formData.get("notes") || "") || null,
      status:         "scheduled",
    }));

    await adminClient().from("schedules").insert(rows);
    redirect(`/dashboard/home-care/schedule?date=${scheduledDate}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/home-care/schedule" className="text-sm hover:underline" style={{ color: navy }}>← Schedule</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Add Shift</h1>
        <p className="text-slate-500 text-sm mt-1">Assign a caregiver to a client visit</p>
      </div>

      <ShiftForm
        staff={staff ?? []}
        residents={residents ?? []}
        action={saveShift}
        backHref="/dashboard/home-care/schedule"
        navy={navy}
      />
    </div>
  );
}
