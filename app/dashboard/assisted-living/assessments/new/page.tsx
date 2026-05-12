import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const purple = "#6d28d9";

export default async function NewAssessmentPage({ searchParams }: { searchParams: Promise<{ resident_id?: string }> }) {
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
    const admDate = String(formData.get("admission_date") || "") || null;
    const assessDate = String(formData.get("assessment_date") || "") || null;
    let nextAssess: string | null = null;
    if (assessDate) { const d = new Date(assessDate); d.setFullYear(d.getFullYear() + 1); nextAssess = d.toISOString().split("T")[0]; }
    let dueDate: string | null = null;
    if (admDate) { const d = new Date(admDate); d.setDate(d.getDate() + 14); dueDate = d.toISOString().split("T")[0]; }
    const resId = String(formData.get("resident_id") || "");
    const res = residents?.find(r => r.id === resId);
    await client.from("resident_assessments_al").insert({
      facility_id: p.facility_id,
      resident_id: resId || null,
      resident_name: String(formData.get("resident_name") || (res ? `${res.first_name} ${res.last_name}` : "")),
      admission_date: admDate,
      assessment_due_date: dueDate,
      assessment_date: assessDate,
      assessed_by: String(formData.get("assessed_by") || "") || null,
      adl_level: String(formData.get("adl_level") || "") || null,
      cognitive_status: String(formData.get("cognitive_status") || "") || null,
      fall_risk: String(formData.get("fall_risk") || "") || null,
      medication_needs: String(formData.get("medication_needs") || "") || null,
      special_needs: String(formData.get("special_needs") || "") || null,
      next_assessment_date: nextAssess,
      notes: String(formData.get("notes") || "") || null,
    });
    redirect("/dashboard/assisted-living/assessments");
  }

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/assisted-living/assessments" className="text-sm hover:underline" style={{ color: purple }}>← Assessments</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">New Resident Assessment</h1>
        <p className="text-slate-500 text-sm mt-1">WAC 388-78A-2160 · Required within 14 days of admission</p>
      </div>

      <form action={save} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Resident</label>
            <select name="resident_id" className={inp} defaultValue={resident_id ?? ""}>
              <option value="">— Select —</option>
              {residents?.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Resident Name *</label>
            <input type="text" name="resident_name" required defaultValue={preselected ? `${preselected.first_name} ${preselected.last_name}` : ""} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Admission Date</label>
            <input type="date" name="admission_date" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Assessment Date</label>
            <input type="date" name="assessment_date" defaultValue={new Date().toISOString().split("T")[0]} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Assessed By</label>
            <input type="text" name="assessed_by" placeholder="Staff name / title" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">ADL Level</label>
            <select name="adl_level" className={inp} defaultValue="">
              <option value="">Select...</option>
              <option>Independent</option><option>Minimal Assist</option>
              <option>Moderate Assist</option><option>Maximum Assist</option><option>Total Assist</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cognitive Status</label>
            <select name="cognitive_status" className={inp} defaultValue="">
              <option value="">Select...</option>
              <option>Intact</option><option>Mild Impairment</option>
              <option>Moderate Impairment</option><option>Severe Impairment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fall Risk</label>
            <select name="fall_risk" className={inp} defaultValue="">
              <option value="">Select...</option>
              <option>Low</option><option>Moderate</option><option>High</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Medication Needs</label>
            <input type="text" name="medication_needs" placeholder="e.g. Requires assistance with medication management" className={inp} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Special Needs / Notes</label>
            <textarea name="special_needs" rows={3} placeholder="Any special care requirements, preferences, or concerns..." className={`${inp} resize-none`} />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-8 py-3 rounded-xl text-white font-bold hover:opacity-90" style={{ backgroundColor: purple }}>Save Assessment</button>
          <Link href="/dashboard/assisted-living/assessments" className="px-6 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
