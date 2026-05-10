import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { WA_COLORS } from "@/lib/compliance/waComplianceUtils";

export const dynamic = "force-dynamic";

export default async function NewTrainingPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: staff } = await supabase
    .from("staff")
    .select("id, first_name, last_name, role")
    .eq("facility_id", profile.facility_id)
    .order("first_name");

  async function saveTraining(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;
    const client = await createClient();
    await client.from("training_records").insert({
      facility_id: p.facility_id,
      staff_id: String(formData.get("staff_id") || "") || null,
      employee_name: String(formData.get("employee_name")),
      training_type: String(formData.get("training_type")),
      training_date: String(formData.get("training_date")),
      training_topic: String(formData.get("training_topic")),
      provider: String(formData.get("provider") || "") || null,
      duration_minutes: Number(formData.get("duration_minutes")) || null,
      certification_number: String(formData.get("certification_number") || "") || null,
      certification_expiration: String(formData.get("certification_expiration") || "") || null,
      notes: String(formData.get("notes") || "") || null,
    });
    redirect("/compliance/training");
  }

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/compliance/training" className="text-sm hover:underline" style={{ color: WA_COLORS.navy }}>← Training Logs</Link>
        <h1 className="text-2xl font-bold mt-2" style={{ color: WA_COLORS.navy }}>Log Training Record</h1>
        <p className="text-slate-500 text-sm mt-1">WAC 246-335-080</p>
      </div>

      <form action={saveTraining} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Staff Member</label>
            <select name="staff_id" className={inp} defaultValue="">
              <option value="">— Select or enter manually —</option>
              {staff?.map((s) => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Employee Name *</label>
            <input type="text" name="employee_name" required placeholder="Full name" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Training Type *</label>
            <select name="training_type" required className={inp} defaultValue="">
              <option value="" disabled>Select type...</option>
              {[
                ["orientation","Orientation"],
                ["infection_control","Infection Control"],
                ["bloodborne_pathogen","Bloodborne Pathogen"],
                ["tb","TB Training"],
                ["mandatory_reporter","Mandatory Reporter"],
                ["emergency_preparedness","Emergency Preparedness"],
                ["food_safety","Food Safety"],
                ["client_specific","Client-Specific"],
                ["annual_inservice","Annual In-Service"],
                ["other","Other"],
              ].map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Training Date *</label>
            <input type="date" name="training_date" required className={inp} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Training Topic / Description *</label>
            <input type="text" name="training_topic" required placeholder="e.g. Annual CPR/First Aid Renewal" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Provider / Instructor</label>
            <input type="text" name="provider" placeholder="e.g. Red Cross" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Duration (minutes)</label>
            <input type="number" name="duration_minutes" placeholder="e.g. 60" min="1" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Certification Number</label>
            <input type="text" name="certification_number" placeholder="If applicable" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Certification Expiration</label>
            <input type="date" name="certification_expiration" className={inp} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
            <textarea name="notes" rows={2} placeholder="Any additional notes..." className={`${inp} resize-none`} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-8 py-3 rounded-xl text-white font-bold hover:opacity-90" style={{ backgroundColor: WA_COLORS.navy }}>
            Save Training Record
          </button>
          <Link href="/compliance/training" className="px-6 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
