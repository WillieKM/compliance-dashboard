import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ChecklistPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  const [{ data: requirements }, { data: documents }] = await Promise.all([
    supabase.from("compliance_requirements").select(`id, applies_to, document_types(id, name, category)`),
    supabase.from("documents").select("document_type_id, expiration_date").eq("facility_id", profile.facility_id),
  ]);

  const today = new Date().toISOString().split("T")[0];
  const total = requirements?.length ?? 0;
  const completed = requirements?.filter((req: any) =>
    documents?.some(doc => doc.document_type_id === req.document_types?.id &&
      (!doc.expiration_date || doc.expiration_date >= today))
  ).length ?? 0;
  const score = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Compliance Checklist</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: "Compliance Score", value: `${score}%`,            cls: "text-blue-700" },
          { label: "Completed",        value: completed,               cls: "text-emerald-600" },
          { label: "Missing",          value: total - completed,       cls: "text-red-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl shadow p-6 border">
            <p className="text-gray-500 text-sm">{s.label}</p>
            <h2 className={`text-5xl font-bold mt-2 ${s.cls}`}>{s.value}</h2>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left p-3 font-semibold text-slate-600">Document</th>
              <th className="text-left p-3 font-semibold text-slate-600">Category</th>
              <th className="text-left p-3 font-semibold text-slate-600">Applies To</th>
              <th className="text-left p-3 font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {requirements?.map((req: any) => {
              const doc = documents?.find(d => d.document_type_id === req.document_types?.id);
              const expired = doc?.expiration_date && doc.expiration_date < today;
              const status = !doc ? "missing" : expired ? "expired" : "complete";
              return (
                <tr key={req.id} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-900">{req.document_types?.name || "Unknown"}</td>
                  <td className="p-3 text-slate-600">{req.document_types?.category || "—"}</td>
                  <td className="p-3 text-slate-500 capitalize">{req.applies_to || "—"}</td>
                  <td className="p-3">
                    {status === "complete" && <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-medium">✓ Complete</span>}
                    {status === "expired"  && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">Expired</span>}
                    {status === "missing"  && (
                      <Link href="/documents/new" className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-medium hover:bg-amber-200">
                        + Upload
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
            {(!requirements || requirements.length === 0) && (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400">No requirements configured. Add document types in your compliance settings.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
