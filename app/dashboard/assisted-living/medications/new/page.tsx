import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const purple = "#9333ea";

export default async function NewMedicationPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: residents } = await supabase
    .from("residents")
    .select("id, first_name, last_name")
    .eq("facility_id", profile.facility_id)
    .order("first_name");

  async function saveMedication(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;
    const client = await createClient();
    const residentId = String(formData.get("resident_id") || "");
    const resident = residents?.find(r => r.id === residentId);
    await client.from("medication_records").insert({
      facility_id:    p.facility_id,
      resident_id:    residentId || null,
      resident_name:  String(formData.get("resident_name") || (resident ? `${resident.first_name} ${resident.last_name}` : "")),
      medication_name: String(formData.get("medication_name")),
      dosage:         String(formData.get("dosage") || "") || null,
      frequency:      String(formData.get("frequency") || "") || null,
      prescriber:     String(formData.get("prescriber") || "") || null,
      route:          String(formData.get("route") || "") || null,
      purpose:        String(formData.get("purpose") || "") || null,
      start_date:     String(formData.get("start_date") || "") || null,
      end_date:       String(formData.get("end_date") || "") || null,
      is_controlled:  formData.get("is_controlled") === "on",
      notes:          String(formData.get("notes") || "") || null,
      status: "active",
    });
    redirect("/dashboard/assisted-living/medications");
  }

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/assisted-living/medications" className="text-sm hover:underline" style={{ color: purple }}>← MAR</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Add Medication</h1>
        <p className="text-slate-500 text-sm mt-1">WAC 388-78A-2570</p>
      </div>

      <form action={saveMedication} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Resident</label>
            <select name="resident_id" className={inp} defaultValue="">
              <option value="">— Select resident —</option>
              {residents?.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Resident Name (if not listed)</label>
            <input type="text" name="resident_name" placeholder="Or type name manually" className={inp} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Medication Name *</label>
            <input type="text" name="medication_name" required placeholder="e.g. Metformin, Lisinopril" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Dosage</label>
            <input type="text" name="dosage" placeholder="e.g. 500mg, 10mg" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Frequency</label>
            <select name="frequency" className={inp} defaultValue="">
              <option value="">Select...</option>
              <option>Once daily</option><option>Twice daily</option><option>Three times daily</option>
              <option>Four times daily</option><option>Every 8 hours</option><option>Every 12 hours</option>
              <option>As needed (PRN)</option><option>Weekly</option><option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Route</label>
            <select name="route" className={inp} defaultValue="">
              <option value="">Select...</option>
              <option value="oral">Oral</option><option value="topical">Topical</option>
              <option value="injection">Injection</option><option value="inhaled">Inhaled</option>
              <option value="sublingual">Sublingual</option><option value="patch">Patch</option><option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Prescribing Physician</label>
            <input type="text" name="prescriber" placeholder="Dr. Smith" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Purpose / Diagnosis</label>
            <input type="text" name="purpose" placeholder="e.g. Type 2 Diabetes" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start Date</label>
            <input type="date" name="start_date" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">End Date (if applicable)</label>
            <input type="date" name="end_date" className={inp} />
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-red-200 bg-red-50 cursor-pointer">
              <input type="checkbox" name="is_controlled" className="w-5 h-5 accent-red-600" />
              <div>
                <p className="text-sm font-bold text-red-900">Controlled Substance</p>
                <p className="text-xs text-red-700">Requires count log and reconciliation per WAC 388-78A-2570</p>
              </div>
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
            <textarea name="notes" rows={2} placeholder="Special instructions, allergies, etc." className={`${inp} resize-none`} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-8 py-3 rounded-xl text-white font-bold hover:opacity-90" style={{ backgroundColor: purple }}>
            Save Medication
          </button>
          <Link href="/dashboard/assisted-living/medications" className="px-6 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
