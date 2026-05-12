import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const purple = "#6d28d9";

export default async function NewISPPage({ searchParams }: { searchParams: Promise<{ resident_id?: string }> }) {
  const { resident_id } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: residents } = await supabase
    .from("residents")
    .select("id, first_name, last_name, created_at")
    .eq("facility_id", profile.facility_id)
    .order("first_name");

  const preselected = residents?.find(r => r.id === resident_id);

  async function saveISP(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;
    const client = await createClient();
    const residentId = String(formData.get("resident_id") || "");
    const res = residents?.find(r => r.id === residentId);
    const admissionDate = String(formData.get("admission_date") || "") || null;
    const ispCreatedDate = String(formData.get("isp_created_date") || "") || null;

    // Next review is 1 year from creation
    let nextReview: string | null = null;
    if (ispCreatedDate) {
      const d = new Date(ispCreatedDate);
      d.setFullYear(d.getFullYear() + 1);
      nextReview = d.toISOString().split("T")[0];
    }

    // ISP due 30 days from admission
    let ispDue: string | null = null;
    if (admissionDate) {
      const d = new Date(admissionDate);
      d.setDate(d.getDate() + 30);
      ispDue = d.toISOString().split("T")[0];
    }

    await client.from("isp_records").insert({
      facility_id:      p.facility_id,
      resident_id:      residentId || null,
      resident_name:    String(formData.get("resident_name") || (res ? `${res.first_name} ${res.last_name}` : "")),
      admission_date:   admissionDate,
      isp_due_date:     ispDue,
      isp_created_date: ispCreatedDate,
      last_review_date: ispCreatedDate,
      next_review_date: nextReview,
      reviewed_by:      String(formData.get("reviewed_by") || "") || null,
      resident_goals:   String(formData.get("resident_goals") || "") || null,
      services_provided: String(formData.get("services_provided") || "") || null,
      resident_signed:  formData.get("resident_signed") === "on",
      rep_signed:       formData.get("rep_signed") === "on",
      status:           ispCreatedDate ? "current" : "pending",
      notes:            String(formData.get("notes") || "") || null,
    });
    redirect("/dashboard/assisted-living/isp");
  }

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/assisted-living/isp" className="text-sm hover:underline" style={{ color: purple }}>← ISP List</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Create Individual Service Plan</h1>
        <p className="text-slate-500 text-sm mt-1">WAC 388-78A-2170 · Required within 30 days of admission</p>
      </div>

      <form action={saveISP} className="space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 border-b border-slate-100 pb-3">Resident Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Resident</label>
              <select name="resident_id" className={inp} defaultValue={resident_id ?? ""}>
                <option value="">— Select or enter manually —</option>
                {residents?.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Resident Name *</label>
              <input type="text" name="resident_name" required
                defaultValue={preselected ? `${preselected.first_name} ${preselected.last_name}` : ""}
                className={inp} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Admission Date</label>
              <input type="date" name="admission_date"
                defaultValue={preselected?.created_at?.split("T")[0] ?? ""}
                className={inp} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">ISP Completed Date</label>
              <input type="date" name="isp_created_date" defaultValue={new Date().toISOString().split("T")[0]} className={inp} />
              <p className="text-xs text-slate-400 mt-1">Next annual review auto-calculated from this date</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 border-b border-slate-100 pb-3">Plan Content</h2>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Resident Goals</label>
            <textarea name="resident_goals" rows={3}
              placeholder="What does the resident want to achieve or maintain? (e.g. maintain mobility, social engagement, health management)"
              className={`${inp} resize-none`} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Services Provided</label>
            <textarea name="services_provided" rows={3}
              placeholder="List all services the facility will provide to meet the resident's needs..."
              className={`${inp} resize-none`} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reviewed / Authored By</label>
            <input type="text" name="reviewed_by" placeholder="Staff name and title" className={inp} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <h2 className="font-bold text-slate-900 border-b border-slate-100 pb-3">Signatures</h2>
          <p className="text-xs text-slate-500">WAC 388-78A-2170 requires signatures from the resident and/or legal representative</p>
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50">
            <input type="checkbox" name="resident_signed" className="w-5 h-5 accent-purple-600" />
            <span className="text-sm font-medium text-slate-700">Resident has signed the ISP</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50">
            <input type="checkbox" name="rep_signed" className="w-5 h-5 accent-purple-600" />
            <span className="text-sm font-medium text-slate-700">Legal representative / family has signed</span>
          </label>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
          <textarea name="notes" rows={2} placeholder="Any additional notes..." className={`${inp} resize-none`} />
        </div>

        <div className="flex gap-3">
          <button type="submit" className="px-8 py-3 rounded-xl text-white font-bold hover:opacity-90" style={{ backgroundColor: purple }}>
            Save ISP
          </button>
          <Link href="/dashboard/assisted-living/isp" className="px-6 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
