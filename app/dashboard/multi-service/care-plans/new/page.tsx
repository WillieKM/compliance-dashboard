import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const teal = "#0f766e";

export default async function NewMultiServiceCarePlanPage({ searchParams }: { searchParams: Promise<{ resident_id?: string }> }) {
  const { resident_id } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: residents } = await supabase.from("residents").select("id, first_name, last_name").eq("facility_id", profile.facility_id).order("first_name");
  const preselected = residents?.find(r => r.id === resident_id);

  async function save(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;
    const client = await createClient();
    const startDate = String(formData.get("start_of_services_date") || "") || null;
    const planDate  = String(formData.get("care_plan_date") || "") || null;
    // Plan due at start of services; review due 60 days after plan is completed.
    const dueDate    = startDate;
    let nextReview: string | null = null;
    if (planDate) { const d = new Date(planDate); d.setDate(d.getDate() + 60); nextReview = d.toISOString().split("T")[0]; }
    const resId = String(formData.get("resident_id") || "");
    const res = residents?.find(r => r.id === resId);
    await client.from("multi_service_care_plans").insert({
      facility_id:            p.facility_id,
      resident_id:            resId || null,
      resident_name:          String(formData.get("resident_name") || (res ? `${res.first_name} ${res.last_name}` : "")),
      start_of_services_date: startDate,
      care_plan_due_date:     dueDate,
      care_plan_date:         planDate,
      prepared_by:            String(formData.get("prepared_by") || "") || null,
      services_provided:      String(formData.get("services_provided") || "") || null,
      medication_needs:       String(formData.get("medication_needs") || "") || null,
      special_needs:          String(formData.get("special_needs") || "") || null,
      next_review_date:       nextReview,
      notes:                  String(formData.get("notes") || "") || null,
    });
    redirect("/dashboard/multi-service/care-plans");
  }

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/multi-service/care-plans" className="text-sm hover:underline" style={{ color: teal }}>← Plans of Care</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">New Plan of Care</h1>
        <p className="text-slate-500 text-sm mt-1">WAC 388-71-0520 · Required at or before start of services · 60-day review cycle</p>
      </div>

      <form action={save} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client</label>
            <select name="resident_id" className={inp} defaultValue={resident_id ?? ""}>
              <option value="">— Select —</option>
              {residents?.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client Name *</label>
            <input type="text" name="resident_name" required defaultValue={preselected ? `${preselected.first_name} ${preselected.last_name}` : ""} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start of Services Date</label>
            <input type="date" name="start_of_services_date" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Plan Completed Date</label>
            <input type="date" name="care_plan_date" defaultValue={new Date().toISOString().split("T")[0]} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Prepared By</label>
            <input type="text" name="prepared_by" placeholder="Staff name / title" className={inp} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Services Provided</label>
            <textarea name="services_provided" rows={2} placeholder="e.g. Personal care, meal preparation, medication reminders, ambulation assistance…" className={`${inp} resize-none`} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Medication Needs</label>
            <input type="text" name="medication_needs" placeholder="e.g. Requires reminders for morning medications" className={inp} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Special Needs / Notes</label>
            <textarea name="special_needs" rows={3} placeholder="Any special care requirements, preferences, or concerns…" className={`${inp} resize-none`} />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-8 py-3 rounded-xl text-white font-bold hover:opacity-90" style={{ backgroundColor: teal }}>Save Plan of Care</button>
          <Link href="/dashboard/multi-service/care-plans" className="px-6 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
