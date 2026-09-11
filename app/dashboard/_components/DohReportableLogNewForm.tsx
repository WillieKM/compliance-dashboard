"use server";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient as adminClient } from "@supabase/supabase-js";
import Link from "next/link";

function admin() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface Props {
  careSetting: "HOME_CARE" | "AFH" | "AL";
  settingLabel: string;
  backHref: string;
  listHref: string;
  headerBg: string;
  wacRef: string;
}

export default async function DohReportableLogNewForm({
  careSetting, settingLabel, backHref, listHref, headerBg, wacRef,
}: Props) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  async function logEvent(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) redirect("/login");

    const { error } = await admin()
      .from("doh_reportable_events")
      .insert({
        facility_id:       p.facility_id,
        care_setting:      careSetting,
        event_date:        formData.get("event_date") as string,
        event_type:        formData.get("event_type") as string,
        resident_name:     formData.get("resident_name") as string || null,
        description:       formData.get("description") as string,
        doh_notified_date: formData.get("doh_notified_date") as string || null,
        doh_notified_by:   formData.get("doh_notified_by") as string || null,
        doh_case_number:   formData.get("doh_case_number") as string || null,
        status:            formData.get("status") as string,
        follow_up_notes:   formData.get("follow_up_notes") as string || null,
        created_by:        formData.get("created_by") as string || null,
      });

    if (error) throw new Error(error.message);
    redirect(listHref);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="rounded-xl text-white px-5 py-4" style={{ background: headerBg }}>
        <Link href={listHref} className="text-white/70 text-sm hover:text-white mb-1 inline-block">
          ← DOH Reportable Events
        </Link>
        <h1 className="text-2xl font-bold">Log DOH Reportable Event</h1>
        <p className="text-white/70 text-sm mt-0.5">{wacRef} — {settingLabel}</p>
      </div>

      <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <span className="font-bold">Time-sensitive: </span>
        WA regulations require DOH notification within 24 hours for abuse, neglect, unexpected death, and serious injury. File this report immediately after the event is discovered, then follow up with the DOH case number once received.
      </div>

      <form action={logEvent} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">

        {/* Event details */}
        <fieldset className="space-y-4">
          <legend className="font-bold text-slate-800 text-sm uppercase tracking-wide border-b pb-1 w-full">Event Details</legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Event Date <span className="text-red-500">*</span></label>
              <input name="event_date" type="date" defaultValue={today} required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Event Type <span className="text-red-500">*</span></label>
              <select name="event_type" required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Select type…</option>
                <option value="abuse">Abuse / Neglect</option>
                <option value="neglect">Neglect (standalone)</option>
                <option value="death">Unexpected Death</option>
                <option value="serious_injury">Serious Injury</option>
                <option value="elopement">Elopement</option>
                <option value="medication_error">Medication Error</option>
                <option value="fall_with_injury">Fall with Serious Injury</option>
                <option value="other">Other Reportable Event</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Resident / Client Name</label>
            <input name="resident_name" type="text" placeholder="Name of person affected"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Description <span className="text-red-500">*</span></label>
            <textarea name="description" rows={4} required
              placeholder="Describe what happened, when it was discovered, and the immediate response taken…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
          </div>
        </fieldset>

        {/* DOH Notification */}
        <fieldset className="space-y-4">
          <legend className="font-bold text-slate-800 text-sm uppercase tracking-wide border-b pb-1 w-full">DOH Notification</legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Date DOH Was Notified</label>
              <input name="doh_notified_date" type="date"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Who Notified DOH</label>
              <input name="doh_notified_by" type="text" placeholder="Staff name / title"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">DOH Case / Confirmation Number</label>
              <input name="doh_case_number" type="text" placeholder="Received after filing"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Status <span className="text-red-500">*</span></label>
              <select name="status" defaultValue="pending" required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="pending">Pending — not yet filed</option>
                <option value="filed">Filed with DOH</option>
                <option value="acknowledged">DOH Acknowledged</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </fieldset>

        {/* Follow-up */}
        <fieldset className="space-y-4">
          <legend className="font-bold text-slate-800 text-sm uppercase tracking-wide border-b pb-1 w-full">Follow-up &amp; Notes</legend>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Follow-up Notes</label>
            <textarea name="follow_up_notes" rows={3}
              placeholder="Investigation findings, corrective actions, DOH correspondence…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Logged By</label>
            <input name="created_by" type="text" placeholder="Your name"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </fieldset>

        <div className="flex gap-3 pt-2">
          <button type="submit"
            className="px-6 py-2.5 rounded-lg text-white text-sm font-bold hover:opacity-90"
            style={{ background: headerBg }}>
            Save Event Log
          </button>
          <Link href={listHref}
            className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
