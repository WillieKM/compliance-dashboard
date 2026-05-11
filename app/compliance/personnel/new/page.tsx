import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { calcPersonnelStatus, getMissingDocuments, getExpiringDocuments, WA_COLORS } from "@/lib/compliance/waComplianceUtils";
import type { PersonnelCompliance } from "@/lib/types/wa-compliance";

export const dynamic = "force-dynamic";

export default async function NewPersonnelPage({
  searchParams,
}: {
  searchParams: Promise<{ staff_id?: string }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  // Load staff list for dropdown
  const { data: staffList } = await supabase
    .from("staff")
    .select("id, first_name, last_name, role")
    .eq("facility_id", profile.facility_id)
    .order("first_name");

  // Pre-select staff if passed via query param
  const preselectedStaff = staffList?.find((s) => s.id === params.staff_id);

  async function savePersonnel(formData: FormData) {
    "use server";

    const profile = await getCurrentProfile();
    if (!profile) return;

    const staffId = String(formData.get("staff_id") || "");
    const employeeName = String(formData.get("employee_name") || "");
    const position = String(formData.get("position") || "");
    const hireDate = String(formData.get("hire_date") || "") || null;

    const bgInitialDate   = String(formData.get("bg_check_initial_date") || "") || null;
    const bgInitialResult = String(formData.get("bg_check_initial_result") || "") || null;
    const bgRenewalDue    = String(formData.get("bg_check_renewal_due") || "") || null;
    const bgRenewalDate   = String(formData.get("bg_check_renewal_date") || "") || null;
    const bgRenewalResult = String(formData.get("bg_check_renewal_result") || "") || null;

    const tbInitialDate   = String(formData.get("tb_assessment_initial_date") || "") || null;
    const tbInitialResult = String(formData.get("tb_assessment_initial_result") || "") || null;
    const tbAnnualDue     = String(formData.get("tb_assessment_annual_due") || "") || null;
    const tbLastDate      = String(formData.get("tb_assessment_last_date") || "") || null;
    const tbLastResult    = String(formData.get("tb_assessment_last_result") || "") || null;

    const licenseType       = String(formData.get("license_type") || "") || null;
    const licenseNumber     = String(formData.get("license_number") || "") || null;
    const licenseExpiration = String(formData.get("license_expiration_date") || "") || null;
    const licenseCurrent    = formData.get("license_current") === "on";

    const orientationDate   = String(formData.get("orientation_complete_date") || "") || null;
    const infectionDate     = String(formData.get("infection_control_training_date") || "") || null;
    const bloodborneDate    = String(formData.get("bloodborne_pathogen_training_date") || "") || null;
    const tbTrainingDate    = String(formData.get("tb_training_date") || "") || null;
    const mandatoryDate     = String(formData.get("mandatory_reporter_training_date") || "") || null;
    const emergencyDate     = String(formData.get("emergency_preparedness_training_date") || "") || null;
    const annualTrainingDue = String(formData.get("annual_training_due_date") || "") || null;

    const perfEvalDate    = String(formData.get("last_performance_eval_date") || "") || null;
    const perfEvalDueDate = String(formData.get("performance_eval_due_date") || "") || null;
    const foodHandlerDate   = String(formData.get("food_handler_permit_date") || "") || null;
    const foodHandlerExpiry = String(formData.get("food_handler_permit_expiry") || "") || null;
    const notes           = String(formData.get("documentation_notes") || "") || null;

    const partial: Partial<PersonnelCompliance> = {
      bg_check_initial_date: bgInitialDate ?? undefined,
      bg_check_initial_result: (bgInitialResult as PersonnelCompliance["bg_check_initial_result"]) ?? undefined,
      bg_check_renewal_due: bgRenewalDue ?? undefined,
      tb_assessment_annual_due: tbAnnualDue ?? undefined,
      tb_assessment_last_result: (tbLastResult as PersonnelCompliance["tb_assessment_last_result"]) ?? undefined,
      license_expiration_date: licenseExpiration ?? undefined,
      annual_training_due_date: annualTrainingDue ?? undefined,
      performance_eval_due_date: perfEvalDueDate ?? undefined,
      orientation_complete_date: orientationDate ?? undefined,
      infection_control_training_date: infectionDate ?? undefined,
      bloodborne_pathogen_training_date: bloodborneDate ?? undefined,
      mandatory_reporter_training_date: mandatoryDate ?? undefined,
      emergency_preparedness_training_date: emergencyDate ?? undefined,
      tb_assessment_initial_date: tbInitialDate ?? undefined,
    };

    const status = calcPersonnelStatus(partial);
    const missing = getMissingDocuments(partial);
    const expiring = getExpiringDocuments(partial);

    const supabase = await createClient();
    await supabase.from("personnel_compliance").insert({
      facility_id: profile.facility_id,
      staff_id: staffId || null,
      employee_name: employeeName,
      position,
      hire_date: hireDate,
      bg_check_initial_date: bgInitialDate,
      bg_check_initial_result: bgInitialResult,
      bg_check_renewal_due: bgRenewalDue,
      bg_check_renewal_date: bgRenewalDate,
      bg_check_renewal_result: bgRenewalResult,
      tb_assessment_initial_date: tbInitialDate,
      tb_assessment_initial_result: tbInitialResult,
      tb_assessment_annual_due: tbAnnualDue,
      tb_assessment_last_date: tbLastDate,
      tb_assessment_last_result: tbLastResult,
      license_type: licenseType,
      license_number: licenseNumber,
      license_expiration_date: licenseExpiration,
      license_current: licenseCurrent,
      orientation_complete_date: orientationDate,
      infection_control_training_date: infectionDate,
      bloodborne_pathogen_training_date: bloodborneDate,
      tb_training_date: tbTrainingDate,
      mandatory_reporter_training_date: mandatoryDate,
      emergency_preparedness_training_date: emergencyDate,
      annual_training_due_date: annualTrainingDue,
      last_performance_eval_date: perfEvalDate,
      performance_eval_due_date: perfEvalDueDate,
      food_handler_permit_date:   foodHandlerDate,
      food_handler_permit_expiry: foodHandlerExpiry,
      compliance_status: status,
      missing_documents: missing,
      expiring_documents: expiring,
      documentation_notes: notes,
      last_audited_date: new Date().toISOString().split("T")[0],
    });

    redirect("/compliance/personnel");
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/compliance/personnel" className="text-sm hover:underline" style={{ color: WA_COLORS.navy }}>
          ← Personnel List
        </Link>
        <h1 className="text-2xl font-bold mt-2" style={{ color: WA_COLORS.navy }}>Add Personnel Compliance Record</h1>
        <p className="text-slate-500 text-sm mt-1">WAC 246-335-080 / 083 / 085</p>
      </div>

      <form action={savePersonnel} className="space-y-6">

        {/* Basic Info */}
        <Section title="Employee Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Link to Staff Member">
              <select name="staff_id" className={input} defaultValue={params.staff_id ?? ""}>
                <option value="">— Select staff or enter manually —</option>
                {staffList?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name} ({s.role || "Staff"})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Employee Name *">
              <input
                type="text" name="employee_name" required
                defaultValue={preselectedStaff ? `${preselectedStaff.first_name} ${preselectedStaff.last_name}` : ""}
                placeholder="Full name" className={input}
              />
            </Field>
            <Field label="Position / Title *">
              <input
                type="text" name="position" required
                defaultValue={preselectedStaff?.role ?? ""}
                placeholder="e.g. Home Care Aide, RN, LPN" className={input}
              />
            </Field>
            <Field label="Hire Date">
              <input type="date" name="hire_date" className={input} />
            </Field>
          </div>
        </Section>

        {/* Background Checks */}
        <Section title="Background Checks" wac="WAC 246-335-085">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Initial Check Date (DSHS BCCU)">
              <input type="date" name="bg_check_initial_date" className={input} />
            </Field>
            <Field label="Initial Result">
              <select name="bg_check_initial_result" className={input} defaultValue="">
                <option value="">Select...</option>
                <option value="clear">Clear</option>
                <option value="pending">Pending</option>
                <option value="issues">Issues</option>
              </select>
            </Field>
            <Field label="Renewal Due Date (2-year cycle)">
              <input type="date" name="bg_check_renewal_due" className={input} />
            </Field>
            <Field label="Renewal Check Type">
              <select name="bg_renewal_type" className={input} defaultValue="">
                <option value="">Select...</option>
                <option value="renewal_wsp">WSP (renewal)</option>
                <option value="renewal_dshs">DSHS BCCU (renewal)</option>
              </select>
            </Field>
            <Field label="Renewal Completed Date">
              <input type="date" name="bg_check_renewal_date" className={input} />
            </Field>
            <Field label="Renewal Result">
              <select name="bg_check_renewal_result" className={input} defaultValue="">
                <option value="">Select...</option>
                <option value="clear">Clear</option>
                <option value="pending">Pending</option>
                <option value="issues">Issues</option>
              </select>
            </Field>
          </div>
        </Section>

        {/* TB Assessments */}
        <Section title="TB Risk Assessments" wac="WAC 246-335-083">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Initial Assessment Date">
              <input type="date" name="tb_assessment_initial_date" className={input} />
            </Field>
            <Field label="Initial Result">
              <select name="tb_assessment_initial_result" className={input} defaultValue="">
                <option value="">Select...</option>
                <option value="negative">Negative</option>
                <option value="positive">Positive</option>
                <option value="not_tested">Not Tested</option>
              </select>
            </Field>
            <Field label="Annual Due Date">
              <input type="date" name="tb_assessment_annual_due" className={input} />
            </Field>
            <Field label="Last Assessment Date">
              <input type="date" name="tb_assessment_last_date" className={input} />
            </Field>
            <Field label="Last Result">
              <select name="tb_assessment_last_result" className={input} defaultValue="">
                <option value="">Select...</option>
                <option value="negative">Negative</option>
                <option value="positive">Positive</option>
                <option value="not_tested">Not Tested</option>
              </select>
            </Field>
          </div>
        </Section>

        {/* License */}
        <Section title="Professional License / Credentials" wac="WAC 246-335-082">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="License Type">
              <select name="license_type" className={input} defaultValue="">
                <option value="">None / Not applicable</option>
                <option value="RN">RN — Registered Nurse</option>
                <option value="LPN">LPN — Licensed Practical Nurse</option>
                <option value="PT">PT — Physical Therapist</option>
                <option value="OT">OT — Occupational Therapist</option>
                <option value="SLP">SLP — Speech Language Pathologist</option>
                <option value="MSW">MSW — Medical Social Worker</option>
                <option value="HCA">HCA — Home Care Aide</option>
                <option value="CNA">CNA — Certified Nursing Assistant</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="License Number">
              <input type="text" name="license_number" placeholder="e.g. RN1234567" className={input} />
            </Field>
            <Field label="License Expiration Date">
              <input type="date" name="license_expiration_date" className={input} />
            </Field>
            <Field label="License Status">
              <label className="flex items-center gap-2 mt-2">
                <input type="checkbox" name="license_current" defaultChecked className="w-4 h-4 accent-blue-600" />
                <span className="text-sm text-slate-700">Current and in good standing</span>
              </label>
            </Field>
          </div>
        </Section>

        {/* Training */}
        <Section title="Training Documentation" wac="WAC 246-335-080">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Orientation Completed">
              <input type="date" name="orientation_complete_date" className={input} />
            </Field>
            <Field label="Infection Control Training">
              <input type="date" name="infection_control_training_date" className={input} />
            </Field>
            <Field label="Bloodborne Pathogen Training">
              <input type="date" name="bloodborne_pathogen_training_date" className={input} />
            </Field>
            <Field label="TB Training">
              <input type="date" name="tb_training_date" className={input} />
            </Field>
            <Field label="Mandatory Reporter Training">
              <input type="date" name="mandatory_reporter_training_date" className={input} />
            </Field>
            <Field label="Emergency Preparedness Training">
              <input type="date" name="emergency_preparedness_training_date" className={input} />
            </Field>
            <Field label="Annual Training Due Date">
              <input type="date" name="annual_training_due_date" className={input} />
            </Field>
          </div>
        </Section>

        {/* Performance Evaluation */}
        <Section title="Performance Evaluation" wac="WAC 246-335-080">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Last Evaluation Date">
              <input type="date" name="last_performance_eval_date" className={input} />
            </Field>
            <Field label="Next Evaluation Due">
              <input type="date" name="performance_eval_due_date" className={input} />
            </Field>
          </div>
        </Section>

        {/* Food Handler Permit (AFH requirement) */}
        <Section title="Food Handler Permit" wac="WAC 388-76-10080">
          <p className="text-xs text-slate-500 mb-3">Required for all AFH staff who handle or serve food.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Permit Issue Date">
              <input type="date" name="food_handler_permit_date" className={input} />
            </Field>
            <Field label="Permit Expiry Date">
              <input type="date" name="food_handler_permit_expiry" className={input} />
            </Field>
          </div>
        </Section>

        {/* Notes */}
        <Section title="Documentation Notes">
          <textarea
            name="documentation_notes" rows={3}
            placeholder="Any notes about this employee's compliance file..."
            className={`${input} resize-none`}
          />
        </Section>

        <div className="flex gap-3">
          <button
            type="submit"
            className="px-8 py-3 rounded-xl text-white font-bold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: WA_COLORS.navy }}
          >
            Save Record
          </button>
          <Link
            href="/compliance/personnel"
            className="px-6 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function Section({ title, wac, children }: { title: string; wac?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <h2 className="font-bold text-slate-900">{title}</h2>
        {wac && <span className="text-xs font-mono text-slate-400">{wac}</span>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const input = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";
