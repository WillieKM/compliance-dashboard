import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { formatDate, WA_COLORS } from "@/lib/compliance/waComplianceUtils";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  complete:       "bg-emerald-100 text-emerald-800 border-emerald-200",
  mostly_complete:"bg-blue-100 text-blue-800 border-blue-200",
  gaps:           "bg-amber-100 text-amber-800 border-amber-200",
  critical_gaps:  "bg-red-100 text-red-800 border-red-200",
};

const STATUS_LABEL: Record<string, string> = {
  complete:       "✓ Complete",
  mostly_complete:"~ Mostly Complete",
  gaps:           "⚠ Gaps",
  critical_gaps:  "✕ Critical Gaps",
};

export default async function ClientsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const fid = profile.facility_id;

  const { data: docs } = await supabase
    .from("client_documentation")
    .select("*")
    .eq("facility_id", fid)
    .order("client_name");

  const { data: residents } = await supabase
    .from("residents")
    .select("id, first_name, last_name")
    .eq("facility_id", fid);

  const allDocs = docs ?? [];
  const withRecords = new Set(allDocs.map((d) => d.resident_id));
  const residentsWithoutRecords = (residents ?? []).filter((r) => !withRecords.has(r.id));

  const critical = allDocs.filter((d) => d.documentation_status === "critical_gaps").length;
  const gaps     = allDocs.filter((d) => d.documentation_status === "gaps").length;
  const complete = allDocs.filter((d) => d.documentation_status === "complete").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: WA_COLORS.navy }}>Client Records Audit</h1>
          <p className="text-slate-500 text-sm mt-0.5">WAC 246-335-055 / 065 · Documentation status per client</p>
        </div>
        <Link href="/compliance/clients/new" className="px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90" style={{ backgroundColor: WA_COLORS.navy }}>
          + Add Client Record
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Complete",      count: complete, cls: "bg-emerald-50 border-emerald-200 text-emerald-800" },
          { label: "Gaps",          count: gaps,     cls: "bg-amber-50 border-amber-200 text-amber-800" },
          { label: "Critical Gaps", count: critical, cls: "bg-red-50 border-red-200 text-red-800" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.count}</p>
            <p className="text-xs font-semibold mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {residentsWithoutRecords.length > 0 && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-900 mb-2">⚠ {residentsWithoutRecords.length} client{residentsWithoutRecords.length > 1 ? "s" : ""} have no documentation record</p>
          <div className="flex flex-wrap gap-2">
            {residentsWithoutRecords.map((r) => (
              <Link key={r.id} href={`/compliance/clients/new?resident_id=${r.id}`}
                className="text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-amber-800 hover:bg-amber-100">
                {r.first_name} {r.last_name} →
              </Link>
            ))}
          </div>
        </div>
      )}

      {allDocs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">🏠</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No client documentation records yet</h3>
          <p className="text-slate-500 mb-4">Add client documentation records to track WAC 246-335 compliance.</p>
          <Link href="/compliance/clients/new" className="inline-block px-6 py-2.5 rounded-lg text-white font-bold text-sm" style={{ backgroundColor: WA_COLORS.navy }}>
            + Add First Record
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ backgroundColor: WA_COLORS.navy }}>
            <h2 className="font-bold text-white">Client Documentation Status</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-600">Client</th>
                <th className="p-3 text-left font-semibold text-slate-600">Assessment</th>
                <th className="p-3 text-left font-semibold text-slate-600">Plan of Care</th>
                <th className="p-3 text-left font-semibold text-slate-600">Visit Notes</th>
                <th className="p-3 text-left font-semibold text-slate-600">Missing Docs</th>
                <th className="p-3 text-left font-semibold text-slate-600">Status</th>
                <th className="p-3 text-right font-semibold text-slate-600">Audit</th>
              </tr>
            </thead>
            <tbody>
              {allDocs.map((doc, i) => (
                <tr key={doc.id} className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                  <td className="p-3">
                    <p className="font-semibold text-slate-900">{doc.client_name}</p>
                    <p className="text-xs text-slate-500">Admitted {formatDate(doc.admission_date)}</p>
                  </td>
                  <td className="p-3">
                    {doc.assessment_completed
                      ? <span className="text-emerald-600 text-xs font-medium">✓ {formatDate(doc.assessment_date)}</span>
                      : <span className="text-red-500 text-xs font-medium">✕ Missing</span>}
                  </td>
                  <td className="p-3">
                    {doc.plan_of_care_created
                      ? <span className={`text-xs font-medium ${doc.plan_of_care_current ? "text-emerald-600" : "text-amber-600"}`}>
                          {doc.plan_of_care_current ? "✓ Current" : "⚠ Needs Review"}
                        </span>
                      : <span className="text-red-500 text-xs font-medium">✕ Missing</span>}
                  </td>
                  <td className="p-3">
                    {doc.visit_notes_filed_on_time
                      ? <span className="text-emerald-600 text-xs font-medium">✓ On Time</span>
                      : <span className="text-amber-600 text-xs font-medium">⚠ Delayed</span>}
                  </td>
                  <td className="p-3">
                    {doc.missing_documentation?.length > 0
                      ? <span className="text-red-600 text-xs font-semibold">{doc.missing_documentation.length} missing</span>
                      : <span className="text-emerald-600 text-xs">None</span>}
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLE[doc.documentation_status] ?? STATUS_STYLE.gaps}`}>
                      {STATUS_LABEL[doc.documentation_status] ?? doc.documentation_status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Link href={`/compliance/clients/${doc.id}`} className="text-xs font-semibold hover:underline" style={{ color: WA_COLORS.navy }}>
                      Audit →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
