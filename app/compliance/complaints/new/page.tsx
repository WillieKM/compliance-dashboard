import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { WA_COLORS } from "@/lib/compliance/waComplianceUtils";

export const dynamic = "force-dynamic";

export default async function NewComplaintPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  async function saveComplaint(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;
    const str  = (k: string) => String(formData.get(k) || "") || null;
    const bool = (k: string) => formData.get(k) === "on";
    const client = await createClient();
    await client.from("complaints").insert({
      facility_id: p.facility_id,
      client_name:           str("client_name") ?? "",
      complaint_date:        str("complaint_date"),
      complaint_description: str("complaint_description") ?? "",
      filed_by:              str("filed_by") ?? "",
      filed_by_relationship: str("filed_by_relationship") ?? "",
      doh_notification_required: bool("doh_notification_required"),
      follow_up_needed:          bool("follow_up_needed"),
      follow_up_date:            str("follow_up_date"),
      status: "open",
    });
    redirect("/compliance/complaints");
  }

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/compliance/complaints" className="text-sm hover:underline" style={{ color: WA_COLORS.navy }}>← Complaints</Link>
        <h1 className="text-2xl font-bold mt-2" style={{ color: WA_COLORS.navy }}>Log New Complaint</h1>
        <p className="text-slate-500 text-sm mt-1">WAC 246-335-045</p>
      </div>

      <form action={saveComplaint} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client Name *</label>
            <input type="text" name="client_name" required placeholder="Client's name" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Complaint Date *</label>
            <input type="date" name="complaint_date" required defaultValue={new Date().toISOString().split("T")[0]} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Filed By *</label>
            <input type="text" name="filed_by" required placeholder="Name of person filing" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Relationship to Client *</label>
            <select name="filed_by_relationship" required className={inp} defaultValue="">
              <option value="" disabled>Select...</option>
              <option value="Client">Client</option>
              <option value="Family Member">Family Member</option>
              <option value="Legal Representative">Legal Representative</option>
              <option value="Caregiver">Caregiver</option>
              <option value="Community Member">Community Member</option>
              <option value="Anonymous">Anonymous</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Complaint Description *</label>
            <textarea name="complaint_description" required rows={4}
              placeholder="Describe the complaint in detail..."
              className={`${inp} resize-none`} />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-3">
          <h3 className="font-semibold text-slate-800">Reporting & Follow-up</h3>
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100">
            <input type="checkbox" name="doh_notification_required" className="mt-0.5 w-4 h-4 accent-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-900">DOH Notification Required</p>
              <p className="text-xs text-red-700 mt-0.5">Check if this complaint requires reporting to Washington State DOH (WAC 246-335-045)</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="follow_up_needed" className="w-4 h-4 accent-blue-600" />
            <span className="text-sm font-medium text-slate-700">Follow-up required</span>
          </label>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Follow-up Date</label>
            <input type="date" name="follow_up_date" className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-8 py-3 rounded-xl text-white font-bold hover:opacity-90" style={{ backgroundColor: WA_COLORS.navy }}>
            Log Complaint
          </button>
          <Link href="/compliance/complaints" className="px-6 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
