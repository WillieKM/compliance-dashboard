import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const teal = "#0f766e";

export default async function NewMultiServiceShiftPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const [{ data: staff }, { data: residents }] = await Promise.all([
    supabase.from("staff").select("id, first_name, last_name").eq("facility_id", profile.facility_id).eq("status", "Active").order("first_name"),
    supabase.from("residents").select("id, first_name, last_name").eq("facility_id", profile.facility_id).order("first_name"),
  ]);

  async function save(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;
    const client = await createClient();
    const staffId = String(formData.get("staff_id") || "");
    const resId   = String(formData.get("resident_id") || "");
    const s = staff?.find(x => x.id === staffId);
    const r = residents?.find(x => x.id === resId);
    await client.from("schedules").insert({
      facility_id:    p.facility_id,
      staff_id:       staffId || null,
      resident_id:    resId || null,
      caregiver_name: s ? `${s.first_name} ${s.last_name}` : String(formData.get("caregiver_name") || ""),
      client_name:    r ? `${r.first_name} ${r.last_name}` : String(formData.get("client_name") || ""),
      scheduled_date: String(formData.get("scheduled_date") || "") || null,
      start_time:     String(formData.get("start_time") || "") || null,
      end_time:       String(formData.get("end_time") || "") || null,
      care_type:      String(formData.get("care_type") || "home_care_visit"),
      recurrence:     String(formData.get("recurrence") || "none"),
      notes:          String(formData.get("notes") || "") || null,
      status:         "scheduled",
    });
    redirect("/dashboard/multi-service/schedule");
  }

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/multi-service/schedule" className="text-sm hover:underline" style={{ color: teal }}>← Schedule</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Add Shift</h1>
      </div>
      <form action={save} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Caregiver</label>
            <select name="staff_id" className={inp} defaultValue="">
              <option value="">— Select —</option>
              {staff?.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client</label>
            <select name="resident_id" className={inp} defaultValue="">
              <option value="">— Select —</option>
              {residents?.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date *</label>
            <input type="date" name="scheduled_date" required defaultValue={new Date().toISOString().split("T")[0]} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Service Type</label>
            <select name="care_type" className={inp} defaultValue="home_care_visit">
              <option value="home_care_visit">Home Care Visit</option>
              <option value="personal_care">Personal Care</option>
              <option value="skilled_nursing">Skilled Nursing</option>
              <option value="therapy">Therapy</option>
              <option value="companionship">Companionship</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start Time</label>
            <input type="time" name="start_time" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">End Time</label>
            <input type="time" name="end_time" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Recurrence</label>
            <select name="recurrence" className={inp} defaultValue="none">
              <option value="none">One-time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
            <textarea name="notes" rows={2} className={`${inp} resize-none`} placeholder="Special instructions, care notes..." />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-8 py-3 rounded-xl text-white font-bold hover:opacity-90" style={{ backgroundColor: teal }}>Save Shift</button>
          <Link href="/dashboard/multi-service/schedule" className="px-6 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
