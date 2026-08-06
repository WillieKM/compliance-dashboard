import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const navy = "#1a3a52";

export default async function NewHomeCareIncidentPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: residents } = await supabase
    .from("residents").select("id, first_name, last_name")
    .eq("facility_id", profile.facility_id).order("first_name");

  async function save(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;
    const client = await createClient();
    const resId = String(formData.get("resident_id") || "");
    const res = residents?.find(r => r.id === resId);
    await client.from("home_care_incidents").insert({
      facility_id:         p.facility_id,
      resident_id:         resId || null,
      resident_name:       String(formData.get("resident_name") || (res ? `${res.first_name} ${res.last_name}` : "")),
      incident_type:       String(formData.get("incident_type") || "other"),
      incident_date:       String(formData.get("incident_date") || "") || null,
      incident_time:       String(formData.get("incident_time") || "") || null,
      location:            String(formData.get("location") || "") || null,
      description:         String(formData.get("description") || "") || null,
      witnessed:           formData.get("witnessed") === "on",
      injury_sustained:    formData.get("injury_sustained") === "on",
      injury_description:  String(formData.get("injury_description") || "") || null,
      immediate_action:    String(formData.get("immediate_action") || "") || null,
      physician_notified:  formData.get("physician_notified") === "on",
      family_notified:     formData.get("family_notified") === "on",
      doh_report_required: formData.get("doh_report_required") === "on",
      contributing_factors: String(formData.get("contributing_factors") || "") || null,
      prevention_plan:     String(formData.get("prevention_plan") || "") || null,
      reported_by:         String(formData.get("reported_by") || "") || null,
      notes:               String(formData.get("notes") || "") || null,
    });
    redirect("/dashboard/home-care/incidents");
  }

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const chk = "flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/home-care/incidents" className="text-sm hover:underline" style={{ color: navy }}>← Incident Log</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Log Incident</h1>
        <p className="text-slate-500 text-sm mt-1">WAC 246-335-065 · DOH notification required for serious incidents</p>
      </div>
      <form action={save} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Incident Type *</label>
            <select name="incident_type" required className={inp} defaultValue="other">
              <option value="fall">Fall</option>
              <option value="injury">Injury</option>
              <option value="medication_error">Medication Error</option>
              <option value="behavioral">Behavioral</option>
              <option value="elopement">Elopement</option>
              <option value="other">Other</option>
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
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client Name</label>
            <input type="text" name="resident_name" placeholder="Or type manually" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date *</label>
            <input type="date" name="incident_date" required defaultValue={new Date().toISOString().split("T")[0]} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Time</label>
            <input type="time" name="incident_time" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Location</label>
            <input type="text" name="location" placeholder="e.g. Client's bathroom, kitchen" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reported By</label>
            <input type="text" name="reported_by" placeholder="Staff name" className={inp} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description *</label>
            <textarea name="description" rows={3} required placeholder="What happened?" className={`${inp} resize-none`} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Immediate Action Taken</label>
            <textarea name="immediate_action" rows={2} placeholder="What was done immediately?" className={`${inp} resize-none`} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contributing Factors</label>
            <textarea name="contributing_factors" rows={2} placeholder="e.g. Wet floor, poor lighting, medication side effects" className={`${inp} resize-none`} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Prevention Plan</label>
            <textarea name="prevention_plan" rows={2} placeholder="Steps to prevent recurrence..." className={`${inp} resize-none`} />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <label className={chk}><input type="checkbox" name="witnessed" className="w-5 h-5 accent-blue-600" /><span className="text-sm font-medium text-slate-700">Incident was witnessed by staff</span></label>
            <label className={chk}><input type="checkbox" name="injury_sustained" className="w-5 h-5 accent-red-600" /><span className="text-sm font-medium text-red-700">Injury was sustained</span></label>
            <input type="text" name="injury_description" placeholder="Describe injury if applicable..." className={inp} />
            <label className={chk}><input type="checkbox" name="physician_notified" className="w-5 h-5 accent-blue-600" /><span className="text-sm font-medium text-slate-700">Physician notified</span></label>
            <label className={chk}><input type="checkbox" name="family_notified" className="w-5 h-5 accent-blue-600" /><span className="text-sm font-medium text-slate-700">Family / representative notified</span></label>
            <label className={`${chk} border-red-200 bg-red-50`}><input type="checkbox" name="doh_report_required" className="w-5 h-5 accent-red-600" /><span className="text-sm font-medium text-red-700">DOH report required (WAC 246-335-025)</span></label>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-8 py-3 rounded-xl text-white font-bold hover:opacity-90" style={{ backgroundColor: navy }}>Save Incident</button>
          <Link href="/dashboard/home-care/incidents" className="px-6 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
