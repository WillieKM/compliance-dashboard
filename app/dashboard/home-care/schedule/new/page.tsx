import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { createClient as admin } from "@supabase/supabase-js";

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

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/home-care/schedule" className="text-sm hover:underline" style={{ color: navy }}>← Schedule</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Add Shift</h1>
        <p className="text-slate-500 text-sm mt-1">Assign a caregiver to a client visit</p>
      </div>

      <form action={saveShift} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Caregiver */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Caregiver *</label>
            {(staff?.length ?? 0) > 0
              ? <select name="staff_id" className={inp} defaultValue=""><option value="">— Select caregiver —</option>{staff?.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}{s.role ? ` (${s.role})` : ""}</option>)}</select>
              : <input type="text" name="caregiver_name" required placeholder="Caregiver name" className={inp} />}
          </div>

          {/* Client */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client</label>
            {(residents?.length ?? 0) > 0
              ? <select name="resident_id" className={inp} defaultValue=""><option value="">— Select client —</option>{residents?.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}</select>
              : <input type="text" name="client_name" placeholder="Client name" className={inp} />}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date *</label>
            <input type="date" name="scheduled_date" required defaultValue={new Date().toISOString().split("T")[0]} className={inp} />
          </div>

          {/* Recurrence */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Repeat</label>
            <select name="recurrence" className={inp} defaultValue="none">
              <option value="none">One-time (no repeat)</option>
              <option value="daily">Daily (7 days)</option>
              <option value="weekly">Weekly (4 weeks)</option>
              <option value="biweekly">Every 2 weeks (4 occurrences)</option>
            </select>
          </div>

          {/* Times */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start Time</label>
            <input type="time" name="start_time" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">End Time</label>
            <input type="time" name="end_time" className={inp} />
          </div>

          {/* Care type */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Visit Type</label>
            <select name="care_type" className={inp} defaultValue="home_care_visit">
              <option value="home_care_visit">Home Care Visit</option>
              <option value="personal_care">Personal Care</option>
              <option value="skilled_nursing">Skilled Nursing</option>
              <option value="therapy">Therapy</option>
              <option value="companionship">Companionship</option>
              <option value="medication_assist">Medication Assist</option>
              <option value="housekeeping">Housekeeping</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
            <textarea name="notes" rows={2} placeholder="Special instructions, supplies needed, etc." className={`${inp} resize-none`} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-8 py-3 rounded-xl text-white font-bold hover:opacity-90" style={{ backgroundColor: navy }}>
            Save Shift
          </button>
          <Link href="/dashboard/home-care/schedule" className="px-6 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
