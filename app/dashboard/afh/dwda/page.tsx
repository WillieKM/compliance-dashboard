import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const amber = "#b45309";

const PREF_LABEL: Record<string, { label: string; cls: string }> = {
  has_directive: { label: "Has Directive",   cls: "bg-amber-100 text-amber-800" },
  no_directive:  { label: "No Directive",    cls: "bg-slate-100 text-slate-600" },
  not_specified: { label: "Not Documented",  cls: "bg-slate-100 text-slate-400" },
};

export default async function DWDAPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const [{ data: policyDoc }, { data: residents }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, document_name, created_at, file_url")
      .eq("facility_id", profile.facility_id)
      .eq("document_type", "dwda_policy")
      .maybeSingle(),
    supabase
      .from("residents")
      .select("id, first_name, last_name, dwda_preference")
      .eq("facility_id", profile.facility_id)
      .order("first_name"),
  ]);

  const allResidents = residents ?? [];
  const undocumented = allResidents.filter(
    (r) => !r.dwda_preference || r.dwda_preference === "not_specified"
  ).length;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/afh" className="text-sm hover:underline" style={{ color: amber }}>
          ← AFH Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Death with Dignity Act (DWDA)</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          HCLA Bulletin #2025-051 · December 2025 · AFH providers must have a written DWDA policy
        </p>
      </div>

      {/* Policy status */}
      {policyDoc ? (
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-bold text-emerald-900">DWDA Policy on file</p>
              <p className="text-sm text-emerald-800 mt-0.5">
                {policyDoc.document_name} — uploaded {new Date(policyDoc.created_at).toLocaleDateString()}
              </p>
              {policyDoc.file_url && (
                <Link href={`/documents/${policyDoc.id}`} className="text-sm font-semibold text-emerald-700 underline mt-1 inline-block">
                  View document →
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-red-900">No DWDA policy document on file</p>
              <p className="text-sm text-red-800 mt-1">
                DSHS requires AFH providers to have a written policy documenting how your home handles Death with Dignity Act requests. Upload it as a facility document with type <code className="bg-red-100 px-1 rounded text-xs">dwda_policy</code>.
              </p>
              <Link
                href="/documents/new"
                className="inline-block mt-3 px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90"
                style={{ backgroundColor: amber }}
              >
                Upload Policy Document →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Requirements info box */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <p className="font-bold text-amber-900 mb-2">DWDA Requirements for AFH (HCLA #2025-051)</p>
        <ul className="text-sm text-amber-800 space-y-1.5">
          <li>• AFH must have a <strong>written policy</strong> on how DWDA requests are handled</li>
          <li>• Providers <strong>cannot interfere with or discourage</strong> a resident&apos;s legal right to use DWDA</li>
          <li>• If the provider objects on moral grounds, they must <strong>transfer the resident</strong> to a willing provider upon request</li>
          <li>• <strong>Resident preferences</strong> should be documented and kept in the resident&apos;s file</li>
        </ul>
      </div>

      {/* Resident preferences */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ backgroundColor: amber }}>
          <h2 className="font-bold text-white">Resident DWDA Preferences ({allResidents.length})</h2>
          {undocumented > 0 && (
            <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full font-semibold">
              {undocumented} not documented
            </span>
          )}
        </div>
        {allResidents.length === 0 ? (
          <p className="text-center text-slate-400 py-8">No residents on file.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-600">Resident</th>
                <th className="p-3 text-left font-semibold text-slate-600">DWDA Preference</th>
                <th className="p-3 text-left font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allResidents.map((r, i) => {
                const pref = PREF_LABEL[r.dwda_preference ?? "not_specified"] ?? PREF_LABEL.not_specified;
                return (
                  <tr key={r.id} className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                    <td className="p-3 font-semibold text-slate-900">{r.first_name} {r.last_name}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pref.cls}`}>
                        {pref.label}
                      </span>
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/residents/${r.id}/edit`}
                        className="text-xs font-semibold hover:underline"
                        style={{ color: amber }}
                      >
                        Update →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
