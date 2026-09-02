import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const amber = "#b45309";

const SEV_STYLE: Record<string, string> = {
  critical:    "bg-red-100 text-red-800 border-red-200",
  serious:     "bg-orange-100 text-orange-800 border-orange-200",
  noncritical: "bg-slate-100 text-slate-700 border-slate-200",
};
const SEV_LABEL: Record<string, string> = {
  critical: "Critical", serious: "Serious", noncritical: "Non-Critical",
};
const OUTCOME_STYLE: Record<string, string> = {
  no_deficiencies:   "bg-emerald-100 text-emerald-800",
  deficiencies_found: "bg-red-100 text-red-800",
  conditional:       "bg-amber-100 text-amber-800",
  pending:           "bg-slate-100 text-slate-600",
};
const OUTCOME_LABEL: Record<string, string> = {
  no_deficiencies: "No Deficiencies", deficiencies_found: "Deficiencies Found",
  conditional: "Conditional", pending: "Pending",
};

export default async function InspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const [{ data: insp }, { data: findings }] = await Promise.all([
    supabase.from("facility_inspections").select("*").eq("id", id).eq("facility_id", profile.facility_id).maybeSingle(),
    supabase.from("inspection_findings").select("*").eq("inspection_id", id).eq("facility_id", profile.facility_id).order("created_at"),
  ]);

  if (!insp) notFound();

  const today = new Date().toISOString().split("T")[0];
  const allFindings = findings ?? [];
  const openCount = allFindings.filter((f) => !f.resolved).length;

  async function addFinding(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;
    const client = await createClient();
    await client.from("inspection_findings").insert({
      facility_id:       p.facility_id,
      inspection_id:     id,
      wac_citation:      String(formData.get("wac_citation") || "") || null,
      severity:          String(formData.get("severity") || "noncritical"),
      description:       String(formData.get("description") || ""),
      corrective_action: String(formData.get("corrective_action") || "") || null,
      deadline:          String(formData.get("deadline") || "") || null,
    });
    revalidatePath(`/dashboard/afh/inspections/${id}`);
  }

  async function resolveFinding(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;
    const client = await createClient();
    const findingId = String(formData.get("finding_id"));
    await client.from("inspection_findings").update({
      resolved:       true,
      resolved_date:  new Date().toISOString().split("T")[0],
      resolved_notes: String(formData.get("resolved_notes") || "") || null,
    }).eq("id", findingId).eq("facility_id", p.facility_id);
    revalidatePath(`/dashboard/afh/inspections/${id}`);
  }

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500";

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/dashboard/afh/inspections" className="text-sm hover:underline" style={{ color: amber }}>← Inspection Log</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            {insp.inspection_date
              ? new Date(insp.inspection_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
              : "Inspection"} — {insp.inspection_type === "annual" ? "Annual" : insp.inspection_type?.replace("_", " ")}
          </h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${OUTCOME_STYLE[insp.outcome] ?? OUTCOME_STYLE.pending}`}>
              {OUTCOME_LABEL[insp.outcome] ?? insp.outcome}
            </span>
            {openCount > 0 && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-semibold">{openCount} open CAP{openCount > 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
      </div>

      {/* Inspection summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="font-bold text-slate-900 mb-3">Inspection Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {[
            { label: "Inspector",       value: insp.inspector_name },
            { label: "DSHS Region",     value: insp.dshs_region },
            { label: "Phone",           value: insp.inspector_phone },
            { label: "Email",           value: insp.inspector_email },
            { label: "Next Inspection", value: insp.next_inspection_date ? new Date(insp.next_inspection_date + "T12:00:00").toLocaleDateString() : null },
          ].map(({ label, value }) => value ? (
            <div key={label} className="flex gap-2">
              <span className="text-slate-400 w-28 shrink-0">{label}:</span>
              <span className="text-slate-800 font-medium">{value}</span>
            </div>
          ) : null)}
        </div>
        {insp.overall_notes && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-slate-700">{insp.overall_notes}</p>
          </div>
        )}
      </div>

      {/* Findings list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ backgroundColor: amber }}>
          <h2 className="font-bold text-white">Findings &amp; Corrective Actions ({allFindings.length})</h2>
          {openCount > 0 && (
            <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full">{openCount} open</span>
          )}
        </div>

        {allFindings.length === 0 ? (
          <p className="text-center text-slate-400 py-6 text-sm">No findings recorded. Use the form below to add deficiencies cited during this inspection.</p>
        ) : (
          <div className="divide-y">
            {allFindings.map((f) => {
              const isOverdue = !f.resolved && f.deadline && f.deadline < today;
              return (
                <div key={f.id} className={`p-5 ${f.resolved ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-3 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${SEV_STYLE[f.severity] ?? SEV_STYLE.noncritical}`}>
                      {SEV_LABEL[f.severity] ?? f.severity}
                    </span>
                    {f.wac_citation && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">{f.wac_citation}</span>
                    )}
                    {f.resolved ? (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">✓ Resolved {f.resolved_date ?? ""}</span>
                    ) : isOverdue ? (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Overdue — was due {f.deadline}</span>
                    ) : f.deadline ? (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Due {f.deadline}</span>
                    ) : null}
                  </div>

                  <p className="text-sm font-semibold text-slate-900 mb-1">{f.description}</p>
                  {f.corrective_action && (
                    <p className="text-xs text-slate-500 mb-2"><span className="font-semibold text-slate-600">CAP:</span> {f.corrective_action}</p>
                  )}
                  {f.resolved && f.resolved_notes && (
                    <p className="text-xs text-emerald-700"><span className="font-semibold">Resolution:</span> {f.resolved_notes}</p>
                  )}

                  {!f.resolved && (
                    <form action={resolveFinding} className="mt-3 flex items-end gap-2">
                      <input type="hidden" name="finding_id" value={f.id} />
                      <div className="flex-1">
                        <input type="text" name="resolved_notes" placeholder="Resolution notes (optional)" className={inp} />
                      </div>
                      <button type="submit" className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shrink-0">
                        Mark Resolved
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add finding form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="font-bold text-slate-900 mb-4">Add Finding / Deficiency</h2>
        <form action={addFinding} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">WAC Citation</label>
              <input type="text" name="wac_citation" placeholder="e.g. WAC 388-76-10415" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Severity</label>
              <select name="severity" className={inp} defaultValue="noncritical">
                <option value="noncritical">Non-Critical</option>
                <option value="serious">Serious</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Deficiency Description *</label>
              <textarea name="description" required rows={2} placeholder="Describe the deficiency as cited by the inspector..." className={`${inp} resize-none`} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Corrective Action Plan</label>
              <textarea name="corrective_action" rows={2} placeholder="Steps being taken to correct this deficiency..." className={`${inp} resize-none`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">CAP Deadline</label>
              <input type="date" name="deadline" className={inp} />
            </div>
          </div>
          <button type="submit" className="px-6 py-2.5 rounded-lg text-white font-bold text-sm hover:opacity-90" style={{ backgroundColor: amber }}>
            Add Finding
          </button>
        </form>
      </div>
    </div>
  );
}
