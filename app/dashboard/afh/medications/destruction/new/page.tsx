"use server";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient as adminClient } from "@supabase/supabase-js";
import Link from "next/link";

export const dynamic = "force-dynamic";
const amber = "#b45309";

function admin() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function logDestruction(formData: FormData) {
  "use server";
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { error } = await admin()
    .from("medication_destruction_log")
    .insert({
      facility_id:        profile.facility_id,
      resident_name:      formData.get("resident_name") as string || null,
      medication_name:    formData.get("medication_name") as string,
      strength:           formData.get("strength") as string || null,
      quantity_amount:    formData.get("quantity_amount") as string,
      unit:               formData.get("unit") as string || null,
      lot_number:         formData.get("lot_number") as string || null,
      expiration_date:    formData.get("expiration_date") as string || null,
      reason:             formData.get("reason") as string,
      destruction_method: formData.get("destruction_method") as string,
      destruction_date:   formData.get("destruction_date") as string,
      staff_name:         formData.get("staff_name") as string,
      witness1_name:      formData.get("witness1_name") as string,
      witness2_name:      formData.get("witness2_name") as string || null,
      notes:              formData.get("notes") as string || null,
    });

  if (error) throw new Error(error.message);
  redirect("/dashboard/afh/medications/destruction");
}

export default async function NewDestructionPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="rounded-xl text-white px-5 py-4" style={{ background: `linear-gradient(135deg, ${amber}, #92400e)` }}>
        <Link href="/dashboard/afh/medications/destruction" className="text-white/70 text-sm hover:text-white mb-1 inline-block">
          ← Destruction Log
        </Link>
        <h1 className="text-2xl font-bold">Log Medication Destruction</h1>
        <p className="text-white/70 text-sm mt-0.5">WAC 388-76-10530 — complete all fields; two-witness rule applies</p>
      </div>

      <form action={logDestruction} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">

        {/* Section: Medication */}
        <fieldset className="space-y-4">
          <legend className="font-bold text-slate-800 text-sm uppercase tracking-wide border-b pb-1 w-full">Medication Details</legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Resident Name <span className="text-slate-400 font-normal">(optional)</span></label>
              <input name="resident_name" type="text" placeholder="Resident name"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Destruction Date <span className="text-red-500">*</span></label>
              <input name="destruction_date" type="date" defaultValue={today} required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Medication Name <span className="text-red-500">*</span></label>
            <input name="medication_name" type="text" required placeholder="e.g. Oxycodone 5mg"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Strength</label>
              <input name="strength" type="text" placeholder="e.g. 5mg"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Quantity <span className="text-red-500">*</span></label>
              <input name="quantity_amount" type="text" required placeholder="e.g. 12"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Unit</label>
              <input name="unit" type="text" placeholder="tablets / mL"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Lot #</label>
              <input name="lot_number" type="text" placeholder="Optional"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Expiration Date</label>
            <input name="expiration_date" type="date"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
        </fieldset>

        {/* Section: Destruction */}
        <fieldset className="space-y-4">
          <legend className="font-bold text-slate-800 text-sm uppercase tracking-wide border-b pb-1 w-full">Destruction Details</legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Reason for Destruction <span className="text-red-500">*</span></label>
              <select name="reason" required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                <option value="">Select reason…</option>
                <option value="expired">Expired</option>
                <option value="discontinued">Discontinued by prescriber</option>
                <option value="death">Resident deceased</option>
                <option value="damaged">Damaged / contaminated</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Destruction Method <span className="text-red-500">*</span></label>
              <select name="destruction_method" required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                <option value="">Select method…</option>
                <option value="flush">Flushed (DEA-approved)</option>
                <option value="waste_bin">Medication Waste Bin</option>
                <option value="return_pharmacy">Returned to pharmacy</option>
                <option value="disposal_box">DEA take-back / disposal box</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </fieldset>

        {/* Section: Staff & Witnesses */}
        <fieldset className="space-y-4">
          <legend className="font-bold text-slate-800 text-sm uppercase tracking-wide border-b pb-1 w-full">Staff &amp; Witnesses</legend>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            WAC 388-76-10530 requires at least one witness present during destruction. Both names must be documented.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Staff Completing Log <span className="text-red-500">*</span></label>
              <input name="staff_name" type="text" required placeholder="Your full name"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Witness 1 <span className="text-red-500">*</span></label>
              <input name="witness1_name" type="text" required placeholder="First witness full name"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Witness 2 <span className="text-slate-400 font-normal">(optional)</span></label>
              <input name="witness2_name" type="text" placeholder="Second witness full name"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>
        </fieldset>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Additional Notes</label>
          <textarea name="notes" rows={3} placeholder="Any additional details…"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit"
            className="px-6 py-2.5 rounded-lg text-white text-sm font-bold hover:opacity-90"
            style={{ backgroundColor: amber }}>
            Save Destruction Record
          </button>
          <Link href="/dashboard/afh/medications/destruction"
            className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
