import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const amber = "#b45309";

export default async function NewFireDrillPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  async function saveDrill(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;
    const client = await createClient();
    const drillDate = String(formData.get("drill_date"));
    // Calculate next due date (1 month later)
    const nextDue = new Date(drillDate);
    nextDue.setMonth(nextDue.getMonth() + 1);

    await client.from("fire_drills").insert({
      facility_id:              p.facility_id,
      drill_date:               drillDate,
      drill_time:               String(formData.get("drill_time") || "") || null,
      drill_type:               String(formData.get("drill_type") || "fire"),
      participants_count:       Number(formData.get("participants_count")) || 0,
      duration_minutes:         Number(formData.get("duration_minutes")) || null,
      conducted_by:             String(formData.get("conducted_by") || "") || null,
      evacuation_time_seconds:  Number(formData.get("evacuation_time_seconds")) || null,
      all_residents_accounted:  formData.get("all_residents_accounted") === "on",
      issues_noted:             String(formData.get("issues_noted") || "") || null,
      corrective_action:        String(formData.get("corrective_action") || "") || null,
      next_due_date:            nextDue.toISOString().split("T")[0],
      notes:                    String(formData.get("notes") || "") || null,
    });
    redirect("/dashboard/afh/fire-drills");
  }

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/afh/fire-drills" className="text-sm hover:underline" style={{ color: amber }}>← Fire Drills</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Log Fire / Disaster Drill</h1>
        <p className="text-slate-500 text-sm mt-1">WAC 388-76-10660</p>
      </div>

      <form action={saveDrill} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Drill Date *</label>
            <input type="date" name="drill_date" required defaultValue={new Date().toISOString().split("T")[0]} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Time of Drill</label>
            <input type="time" name="drill_time" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Drill Type</label>
            <select name="drill_type" className={inp} defaultValue="fire">
              <option value="fire">Fire</option>
              <option value="earthquake">Earthquake</option>
              <option value="evacuation">Evacuation</option>
              <option value="lockdown">Lockdown</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Conducted By</label>
            <input type="text" name="conducted_by" placeholder="Staff name" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Number of Participants</label>
            <input type="number" name="participants_count" min="0" placeholder="e.g. 6" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Duration (minutes)</label>
            <input type="number" name="duration_minutes" min="0" placeholder="e.g. 15" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Evacuation Time (seconds)</label>
            <input type="number" name="evacuation_time_seconds" min="0" placeholder="e.g. 120" className={inp} />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="all_residents_accounted" defaultChecked className="w-5 h-5 accent-emerald-600" />
              <span className="text-sm font-semibold text-slate-700">All residents accounted for</span>
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Issues Noted</label>
            <textarea name="issues_noted" rows={2} placeholder="Any problems observed during the drill..." className={`${inp} resize-none`} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Corrective Action Plan</label>
            <textarea name="corrective_action" rows={2} placeholder="Steps taken to address any issues..." className={`${inp} resize-none`} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Additional Notes</label>
            <textarea name="notes" rows={2} placeholder="Any other observations..." className={`${inp} resize-none`} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-8 py-3 rounded-xl text-white font-bold hover:opacity-90" style={{ backgroundColor: amber }}>
            Save Drill Log
          </button>
          <Link href="/dashboard/afh/fire-drills" className="px-6 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
