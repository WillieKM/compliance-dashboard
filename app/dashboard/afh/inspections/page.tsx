import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const amber = "#b45309";

const OUTCOME_STYLE: Record<string, string> = {
  no_deficiencies:  "bg-emerald-100 text-emerald-800",
  deficiencies_found: "bg-red-100 text-red-800",
  conditional:      "bg-amber-100 text-amber-800",
  pending:          "bg-slate-100 text-slate-600",
};
const OUTCOME_LABEL: Record<string, string> = {
  no_deficiencies:  "No Deficiencies",
  deficiencies_found: "Deficiencies Found",
  conditional:      "Conditional",
  pending:          "Pending",
};
const TYPE_LABEL: Record<string, string> = {
  annual:     "Annual",
  complaint:  "Complaint",
  follow_up:  "Follow-up",
  licensing:  "Licensing",
  fire:       "Fire",
  other:      "Other",
};

export default async function AFHInspectionsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: inspections } = await supabase
    .from("facility_inspections")
    .select("*, inspection_findings(id, resolved, severity, deadline)")
    .eq("facility_id", profile.facility_id)
    .eq("care_setting", "AFH")
    .order("inspection_date", { ascending: false });

  const all = inspections ?? [];
  const today = new Date().toISOString().split("T")[0];

  const totalInspections  = all.length;
  const cleanInspections  = all.filter((i) => i.outcome === "no_deficiencies").length;

  // Flatten all findings across all inspections
  const allFindings = all.flatMap((i) => (i.inspection_findings ?? []).map((f: { id: string; resolved: boolean; severity: string; deadline: string | null }) => ({ ...f, inspection_id: i.id })));
  const openCAPs    = allFindings.filter((f) => !f.resolved).length;
  const overdueCAPs = allFindings.filter((f) => !f.resolved && f.deadline && f.deadline < today).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href="/dashboard/afh" className="text-sm hover:underline" style={{ color: amber }}>← AFH Dashboard</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">DSHS Inspection Log</h1>
          <p className="text-slate-500 text-sm mt-0.5">WAC 388-76 · Track inspections, deficiency findings, and corrective action plans</p>
        </div>
        <Link href="/dashboard/afh/inspections/new"
          className="px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90"
          style={{ backgroundColor: amber }}>
          + Log Inspection
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Inspections", value: totalInspections,  cls: "bg-amber-50 border-amber-200 text-amber-800" },
          { label: "Deficiency-Free",   value: cleanInspections,  cls: "bg-emerald-50 border-emerald-200 text-emerald-800" },
          { label: "Open CAPs",         value: openCAPs,          cls: openCAPs > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-slate-50 border-slate-200 text-slate-700" },
          { label: "Overdue CAPs",      value: overdueCAPs,       cls: overdueCAPs > 0 ? "bg-red-50 border-red-300 text-red-900" : "bg-slate-50 border-slate-200 text-slate-700" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs font-semibold mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Overdue CAP alert */}
      {overdueCAPs > 0 && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 flex items-start gap-3">
          <span className="text-2xl shrink-0">🚨</span>
          <div>
            <p className="font-bold text-red-900">{overdueCAPs} corrective action plan{overdueCAPs > 1 ? "s are" : " is"} past deadline</p>
            <p className="text-sm text-red-800 mt-0.5">Review open inspections below and mark findings resolved or update their deadlines immediately.</p>
          </div>
        </div>
      )}

      {/* Inspections list */}
      {all.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">🔍</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No inspections logged yet</h3>
          <p className="text-slate-500 mb-4 text-sm">Log your last DSHS inspection to start tracking deficiencies and corrective actions.</p>
          <Link href="/dashboard/afh/inspections/new"
            className="inline-block px-6 py-2.5 rounded-lg text-white font-bold text-sm hover:opacity-90"
            style={{ backgroundColor: amber }}>
            Log First Inspection
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {all.map((insp) => {
            const findings = insp.inspection_findings ?? [];
            const open     = findings.filter((f: { resolved: boolean }) => !f.resolved).length;
            const critical = findings.filter((f: { severity: string }) => f.severity === "critical").length;
            return (
              <Link key={insp.id} href={`/dashboard/afh/inspections/${insp.id}`}
                className="block bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-amber-300 transition-all">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${OUTCOME_STYLE[insp.outcome] ?? OUTCOME_STYLE.pending}`}>
                        {OUTCOME_LABEL[insp.outcome] ?? insp.outcome}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                        {TYPE_LABEL[insp.inspection_type] ?? insp.inspection_type}
                      </span>
                      {critical > 0 && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-semibold">
                          {critical} Critical
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-900">
                      {insp.inspection_date
                        ? new Date(insp.inspection_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                        : "Date not recorded"}
                    </p>
                    {insp.inspector_name && (
                      <p className="text-sm text-slate-500 mt-0.5">Inspector: {insp.inspector_name}{insp.dshs_region ? ` · ${insp.dshs_region}` : ""}</p>
                    )}
                    {insp.overall_notes && (
                      <p className="text-xs text-slate-400 mt-1 truncate">{insp.overall_notes}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-slate-700">{findings.length} finding{findings.length !== 1 ? "s" : ""}</p>
                    {open > 0
                      ? <p className="text-xs text-red-600 font-semibold">{open} open CAP{open !== 1 ? "s" : ""}</p>
                      : findings.length > 0
                        ? <p className="text-xs text-emerald-600 font-semibold">All resolved ✓</p>
                        : null}
                    <p className="text-xs text-amber-600 mt-1">View details →</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Info box */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-bold text-amber-900 mb-1">About DSHS Inspections (AFH)</p>
        <p>AFHs are typically inspected annually by DSHS Residential Care Services. Complaint-based inspections can occur at any time. After a deficiency is cited, providers must submit a corrective action plan (CAP) within the timeframe specified by the inspector.</p>
      </div>
    </div>
  );
}
