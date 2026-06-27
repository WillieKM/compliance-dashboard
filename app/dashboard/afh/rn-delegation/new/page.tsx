import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const amber = "#b45309";

export default async function NewAFHRNDelegationPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: residents } = await supabase.from("residents").select("id, first_name, last_name").eq("facility_id", profile.facility_id).order("first_name");

  async function save(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;
    const client = await createClient();
    const delegDate = String(formData.get("delegation_date") || "") || null;
    let nextReview: string | null = null;
    if (delegDate) { const d = new Date(delegDate); d.setMonth(d.getMonth() + 6); nextReview = d.toISOString().split("T")[0]; }
    const resId = String(formData.get("resident_id") || "");
    await client.from("rn_delegations").insert({
      facility_id: p.facility_id,
      resident_id: resId || null,
      resident_name: String(formData.get("resident_name") || ""),
      rn_name: String(formData.get("rn_name") || ""),
      rn_license: String(formData.get("rn_license") || "") || null,
      delegate_name: String(formData.get("delegate_name") || ""),
      medications_delegated: String(formData.get("medications_delegated") || "") || null,
      delegation_date: delegDate,
      expiry_date: String(formData.get("expiry_date") || "") || null,
      next_review_date: nextReview,
      competency_verified: formData.get("competency_verified") === "on",
      notes: String(formData.get("notes") || "") || null,
      status: "active",
    });
    redirect("/dashboard/afh/rn-delegation");
  }

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/afh/rn-delegation" className="text-sm hover:underline" style={{ color: amber }}>← RN Delegation</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">New RN Delegation</h1>
        <p className="text-slate-500 text-sm mt-1">WAC 388-76-10530</p>
      </div>
      <form action={save} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Delegating RN Name *</label><input type="text" name="rn_name" required placeholder="Full name" className={inp} /></div>
          <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">RN License #</label><input type="text" name="rn_license" placeholder="e.g. RN1234567" className={inp} /></div>
          <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Staff Delegate (receiving) *</label><input type="text" name="delegate_name" required placeholder="Staff member name" className={inp} /></div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Resident</label>
            <select name="resident_id" className={inp} defaultValue="">
              <option value="">— Select resident —</option>
              {residents?.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Resident Name</label><input type="text" name="resident_name" placeholder="Or type manually" className={inp} /></div>
          <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Delegation Date</label><input type="date" name="delegation_date" defaultValue={new Date().toISOString().split("T")[0]} className={inp} /></div>
          <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Expiry Date</label><input type="date" name="expiry_date" className={inp} /></div>
          <div className="sm:col-span-2"><label className="block text-sm font-semibold text-slate-700 mb-1.5">Medications Delegated</label><textarea name="medications_delegated" rows={2} placeholder="List specific medications and tasks delegated..." className={`${inp} resize-none`} /></div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50">
              <input type="checkbox" name="competency_verified" className="w-5 h-5 accent-amber-600" />
              <span className="text-sm font-medium text-slate-700">Staff competency verified by RN before delegation</span>
            </label>
          </div>
          <div className="sm:col-span-2"><label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label><textarea name="notes" rows={2} className={`${inp} resize-none`} /></div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-8 py-3 rounded-xl text-white font-bold hover:opacity-90" style={{ backgroundColor: amber }}>Save Delegation</button>
          <Link href="/dashboard/afh/rn-delegation" className="px-6 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
