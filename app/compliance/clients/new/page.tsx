import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { WA_COLORS } from "@/lib/compliance/waComplianceUtils";

export const dynamic = "force-dynamic";

export default async function NewClientDocPage({
  searchParams,
}: {
  searchParams: Promise<{ resident_id?: string }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: residents } = await supabase
    .from("residents")
    .select("id, first_name, last_name")
    .eq("facility_id", profile.facility_id)
    .order("first_name");

  const preselected = residents?.find((r) => r.id === params.resident_id);

  async function saveClientDoc(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;

    const bool = (key: string) => formData.get(key) === "on";
    const str  = (key: string) => String(formData.get(key) || "") || null;

    const missing: string[] = [];
    if (!bool("assessment_completed"))    missing.push("Initial Assessment");
    if (!bool("plan_of_care_created"))    missing.push("Plan of Care");
    if (!bool("advance_directive_on_file")) missing.push("Advance Directive");
    if (!bool("medication_list_current")) missing.push("Medication List");
    if (!bool("client_rights_provided"))  missing.push("Client Rights Notice");

    const hasGaps = missing.length > 0;
    const hasCritical = !bool("assessment_completed") || !bool("plan_of_care_created") || !bool("client_rights_provided");
    const status = hasCritical ? "critical_gaps" : hasGaps ? "gaps" : bool("plan_of_care_current") ? "complete" : "mostly_complete";

    const client = await createClient();
    await client.from("client_documentation").insert({
      facility_id: p.facility_id,
      resident_id: str("resident_id"),
      client_name: str("client_name") ?? "",
      admission_date: str("admission_date"),
      discharge_date: str("discharge_date"),
      assessment_completed:      bool("assessment_completed"),
      assessment_date:           str("assessment_date"),
      plan_of_care_created:      bool("plan_of_care_created"),
      plan_of_care_date:         str("plan_of_care_date"),
      plan_of_care_current:      bool("plan_of_care_current"),
      last_plan_review_date:     str("last_plan_review_date"),
      visit_notes_filed_on_time: bool("visit_notes_filed_on_time"),
      last_visit_note_date:      str("last_visit_note_date"),
      advance_directive_on_file: bool("advance_directive_on_file"),
      polst_form_on_file:        bool("polst_form_on_file"),
      medication_list_current:   bool("medication_list_current"),
      client_rights_provided:    bool("client_rights_provided"),
      discharge_notice_provided: bool("discharge_notice_provided"),
      discharge_summary_complete:bool("discharge_summary_complete"),
      alternative_services_provided: bool("alternative_services_provided"),
      documentation_status: status,
      missing_documentation: missing,
      last_audited_date: new Date().toISOString().split("T")[0],
    });
    redirect("/compliance/clients");
  }

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/compliance/clients" className="text-sm hover:underline" style={{ color: WA_COLORS.navy }}>← Client Records</Link>
        <h1 className="text-2xl font-bold mt-2" style={{ color: WA_COLORS.navy }}>Add Client Documentation Record</h1>
        <p className="text-slate-500 text-sm mt-1">WAC 246-335-055 / 065</p>
      </div>

      <form action={saveClientDoc} className="space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 border-b border-slate-100 pb-3">Client Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Link to Resident</label>
              <select name="resident_id" className={inp} defaultValue={params.resident_id ?? ""}>
                <option value="">— Select or enter manually —</option>
                {residents?.map((r) => (
                  <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client Name *</label>
              <input type="text" name="client_name" required
                defaultValue={preselected ? `${preselected.first_name} ${preselected.last_name}` : ""}
                className={inp} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Admission Date</label>
              <input type="date" name="admission_date" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Discharge Date (if applicable)</label>
              <input type="date" name="discharge_date" className={inp} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 border-b border-slate-100 pb-3">
            Required Documentation <span className="text-xs font-mono text-slate-400 ml-2">WAC 246-335-055</span>
          </h2>
          {[
            { key: "assessment_completed",      label: "Initial Assessment Completed",       dateKey: "assessment_date",        dateLbl: "Assessment Date" },
            { key: "plan_of_care_created",       label: "Plan of Care Created & Signed",      dateKey: "plan_of_care_date",       dateLbl: "POC Date" },
            { key: "plan_of_care_current",       label: "Plan of Care Current (reviewed ≤60d)", dateKey: "last_plan_review_date", dateLbl: "Last Review" },
          ].map(({ key, label, dateKey, dateLbl }) => (
            <div key={key} className="flex items-start gap-4 py-2 border-b border-slate-50 last:border-0">
              <label className="flex items-center gap-2 flex-1 cursor-pointer">
                <input type="checkbox" name={key} className="w-4 h-4 accent-emerald-600" />
                <span className="text-sm font-medium text-slate-700">{label}</span>
              </label>
              <div className="w-40">
                <input type="date" name={dateKey} placeholder={dateLbl}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>
          ))}
          {[
            { key: "visit_notes_filed_on_time",  label: "Visit Notes Filed Within 7 Days",    dateKey: "last_visit_note_date",   dateLbl: "Last Note" },
            { key: "advance_directive_on_file",  label: "Advance Directive on File",           dateKey: null, dateLbl: null },
            { key: "polst_form_on_file",          label: "POLST Form on File",                  dateKey: null, dateLbl: null },
            { key: "medication_list_current",    label: "Current Medication List on File",     dateKey: null, dateLbl: null },
            { key: "client_rights_provided",     label: "Client Rights Notice Provided",       dateKey: null, dateLbl: null },
          ].map(({ key, label, dateKey, dateLbl }) => (
            <div key={key} className="flex items-center gap-4 py-2 border-b border-slate-50 last:border-0">
              <label className="flex items-center gap-2 flex-1 cursor-pointer">
                <input type="checkbox" name={key} className="w-4 h-4 accent-emerald-600" />
                <span className="text-sm font-medium text-slate-700">{label}</span>
              </label>
              {dateKey && (
                <div className="w-40">
                  <input type="date" name={dateKey}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button type="submit" className="px-8 py-3 rounded-xl text-white font-bold hover:opacity-90" style={{ backgroundColor: WA_COLORS.navy }}>
            Save Record
          </button>
          <Link href="/compliance/clients" className="px-6 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
