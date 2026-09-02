import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const amber = "#b45309";

export default async function NewAfhSafetyAssessmentPage({ searchParams }: { searchParams: Promise<{ resident_id?: string }> }) {
  const { resident_id } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: residents } = await supabase
    .from("residents").select("id, first_name, last_name")
    .eq("facility_id", profile.facility_id).order("first_name");

  const preselected = residents?.find(r => r.id === resident_id);

  async function save(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;
    const client = await createClient();
    const resId = String(formData.get("resident_id") || "");
    const res = residents?.find(r => r.id === resId);
    const assessDate = String(formData.get("assessment_date") || "") || null;
    let nextDate: string | null = null;
    if (assessDate) {
      const d = new Date(assessDate);
      d.setFullYear(d.getFullYear() + 1);
      nextDate = d.toISOString().split("T")[0];
    }
    await client.from("afh_safety_assessments").insert({
      facility_id:          p.facility_id,
      resident_id:          resId || null,
      resident_name:        String(formData.get("resident_name") || (res ? `${res.first_name} ${res.last_name}` : "")),
      assessment_date:      assessDate,
      assessed_by:          String(formData.get("assessed_by") || "") || null,
      fall_risk:            String(formData.get("fall_risk") || "low"),
      fall_risk_notes:      String(formData.get("fall_risk_notes") || "") || null,
      hazards_identified:   String(formData.get("hazards_identified") || "") || null,
      medication_access:    String(formData.get("medication_access") || "safe"),
      medication_notes:     String(formData.get("medication_notes") || "") || null,
      emergency_plan:       String(formData.get("emergency_plan") || "") || null,
      emergency_contacts:   String(formData.get("emergency_contacts") || "") || null,
      smoke_detector:              formData.get("smoke_detector") === "on",
      co_detector:                 formData.get("co_detector") === "on",
      clear_egress:                formData.get("clear_egress") === "on",
      emergency_window_clearance:  formData.get("emergency_window_clearance") === "on",
      action_items:         String(formData.get("action_items") || "") || null,
      next_assessment_date: nextDate,
      notes:                String(formData.get("notes") || "") || null,
    });
    redirect("/dashboard/afh/safety-assessments");
  }

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500";
  const chk = "flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/afh/safety-assessments" className="text-sm hover:underline" style={{ color: amber }}>← Safety Assessments</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">New Safety Assessment</h1>
        <p className="text-slate-500 text-sm mt-1">WAC 388-76-10820 · Home Safety / Inspections · Annual review cycle</p>
      </div>
      <form action={save} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
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
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Assessment Date</label>
            <input type="date" name="assessment_date" defaultValue={new Date().toISOString().split("T")[0]} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Assessed By</label>
            <input type="text" name="assessed_by" placeholder="Staff name / title" className={inp} />
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-bold text-slate-800 mb-3">Fall Risk</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fall Risk Level</label>
              <select name="fall_risk" className={inp} defaultValue="low">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fall Risk Notes</label>
              <input type="text" name="fall_risk_notes" placeholder="e.g. Uses walker, history of falls" className={inp} />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-bold text-slate-800 mb-3">Facility Environment</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Hazards Identified</label>
              <textarea name="hazards_identified" rows={2} placeholder="e.g. Loose rugs, poor lighting in hallway, cluttered pathways" className={`${inp} resize-none`} />
            </div>
            <div className="space-y-2">
              <label className={chk}><input type="checkbox" name="smoke_detector" className="w-5 h-5 accent-amber-600" /><span className="text-sm font-medium text-slate-700">Working smoke detector present</span></label>
              <label className={chk}><input type="checkbox" name="co_detector" className="w-5 h-5 accent-amber-600" /><span className="text-sm font-medium text-slate-700">Working CO detector present</span></label>
              <label className={chk}><input type="checkbox" name="clear_egress" className="w-5 h-5 accent-amber-600" /><span className="text-sm font-medium text-slate-700">Clear egress / exit routes</span></label>
              <label className={chk}><input type="checkbox" name="emergency_window_clearance" className="w-5 h-5 accent-amber-600" /><span className="text-sm font-medium text-slate-700">36-inch clearance in front of at least one resident bedroom window <span className="text-xs text-slate-400">(WAC 388-76 rulemaking — new licenses)</span></span></label>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-bold text-slate-800 mb-3">Medication & Emergency</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Medication Access</label>
              <select name="medication_access" className={inp} defaultValue="safe">
                <option value="safe">Safe / appropriately stored</option>
                <option value="needs_lockbox">Needs lockbox</option>
                <option value="other">Other concern</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Medication Notes</label>
              <input type="text" name="medication_notes" placeholder="Additional notes" className={inp} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Emergency Plan</label>
              <textarea name="emergency_plan" rows={2} placeholder="e.g. Residents are assisted to exits, 911 called first, agency notified." className={`${inp} resize-none`} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Emergency Contacts</label>
              <input type="text" name="emergency_contacts" placeholder="Name, relationship, phone" className={inp} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Action Items / Follow-up</label>
              <textarea name="action_items" rows={2} placeholder="Items to address before or shortly after assessment..." className={`${inp} resize-none`} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-8 py-3 rounded-xl text-white font-bold hover:opacity-90" style={{ backgroundColor: amber }}>Save Assessment</button>
          <Link href="/dashboard/afh/safety-assessments" className="px-6 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
