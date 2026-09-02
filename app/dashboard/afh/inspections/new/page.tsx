import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const amber = "#b45309";

export default async function NewInspectionPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  async function save(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;
    const client = await createClient();
    const { data, error } = await client.from("facility_inspections").insert({
      facility_id:          p.facility_id,
      care_setting:         "AFH",
      inspection_date:      String(formData.get("inspection_date") || "") || null,
      inspection_type:      String(formData.get("inspection_type") || "annual"),
      inspector_name:       String(formData.get("inspector_name") || "") || null,
      inspector_phone:      String(formData.get("inspector_phone") || "") || null,
      inspector_email:      String(formData.get("inspector_email") || "") || null,
      dshs_region:          String(formData.get("dshs_region") || "") || null,
      outcome:              String(formData.get("outcome") || "pending"),
      overall_notes:        String(formData.get("overall_notes") || "") || null,
      next_inspection_date: String(formData.get("next_inspection_date") || "") || null,
    }).select("id").single();
    if (error || !data) redirect("/dashboard/afh/inspections");
    redirect(`/dashboard/afh/inspections/${data.id}`);
  }

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/afh/inspections" className="text-sm hover:underline" style={{ color: amber }}>← Inspection Log</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Log Inspection</h1>
        <p className="text-slate-500 text-sm mt-1">WAC 388-76 · Record inspection details — you can add findings on the next screen</p>
      </div>

      <form action={save} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Inspection Date *</label>
            <input type="date" name="inspection_date" required defaultValue={new Date().toISOString().split("T")[0]} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Inspection Type *</label>
            <select name="inspection_type" required className={inp} defaultValue="annual">
              <option value="annual">Annual</option>
              <option value="complaint">Complaint Investigation</option>
              <option value="follow_up">Follow-up</option>
              <option value="licensing">Licensing / Initial</option>
              <option value="fire">Fire Safety</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-bold text-slate-800 mb-3">Inspector Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Inspector Name</label>
              <input type="text" name="inspector_name" placeholder="Full name" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">DSHS Region / Office</label>
              <input type="text" name="dshs_region" placeholder="e.g. Region 2 — Spokane" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Inspector Phone</label>
              <input type="tel" name="inspector_phone" placeholder="(509) 000-0000" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Inspector Email</label>
              <input type="email" name="inspector_email" placeholder="inspector@dshs.wa.gov" className={inp} />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-bold text-slate-800 mb-3">Outcome</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Inspection Outcome</label>
              <select name="outcome" className={inp} defaultValue="pending">
                <option value="pending">Pending / In Progress</option>
                <option value="no_deficiencies">No Deficiencies</option>
                <option value="deficiencies_found">Deficiencies Found</option>
                <option value="conditional">Conditional</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estimated Next Inspection</label>
              <input type="date" name="next_inspection_date" className={inp} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Overall Notes</label>
              <textarea name="overall_notes" rows={3} placeholder="General inspection notes, areas reviewed, verbal feedback from inspector..." className={`${inp} resize-none`} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-8 py-3 rounded-xl text-white font-bold hover:opacity-90" style={{ backgroundColor: amber }}>
            Save &amp; Add Findings →
          </button>
          <Link href="/dashboard/afh/inspections" className="px-6 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
