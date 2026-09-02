import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ChecklistPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const orgCareSettings = profile.organizations?.care_settings ?? [];

  const [{ data: allRequirements }, { data: documents }] = await Promise.all([
    supabase.from("compliance_requirements")
      .select(`id, applies_to, facility_type, document_types(id, name, category)`)
      .in("facility_type", orgCareSettings),
    supabase.from("documents").select("document_type_id, expiration_date").eq("facility_id", profile.facility_id),
  ]);

  // A requirement applying to multiple of the org's settings has one row per
  // setting (facility_type is single-valued) — dedupe by document type so an
  // org running 2+ settings doesn't see the same requirement listed twice.
  const seenDocTypes = new Set<string>();
  const requirements = (allRequirements ?? []).filter((req: any) => {
    const dtId = req.document_types?.id;
    if (!dtId) return true;
    if (seenDocTypes.has(dtId)) return false;
    seenDocTypes.add(dtId);
    return true;
  });

  const today = new Date().toISOString().split("T")[0];
  const in30Days = new Date(); in30Days.setDate(in30Days.getDate() + 30);
  const in30Str  = in30Days.toISOString().split("T")[0];

  const total = requirements.length;
  const completed = requirements.filter((req: any) =>
    documents?.some(doc => doc.document_type_id === req.document_types?.id &&
      (!doc.expiration_date || doc.expiration_date >= today))
  ).length;
  const score = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Documents with expiry dates within the next 30 days (not yet expired)
  const expiringSoon = (documents ?? []).filter(d =>
    d.expiration_date && d.expiration_date >= today && d.expiration_date <= in30Str
  );

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Compliance Checklist</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Compliance Score", value: `${score}%`,            cls: "text-blue-700" },
          { label: "Completed",        value: completed,               cls: "text-emerald-600" },
          { label: "Expiring Soon",    value: expiringSoon.length,     cls: expiringSoon.length > 0 ? "text-amber-600" : "text-slate-400" },
          { label: "Missing / Expired",value: total - completed,       cls: "text-red-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl shadow p-6 border">
            <p className="text-gray-500 text-sm">{s.label}</p>
            <h2 className={`text-5xl font-bold mt-2 ${s.cls}`}>{s.value}</h2>
          </div>
        ))}
      </div>

      {expiringSoon.length > 0 && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 mb-6">
          <p className="font-bold text-amber-900 mb-2">⏰ {expiringSoon.length} document{expiringSoon.length > 1 ? "s" : ""} expiring within 30 days</p>
          <div className="space-y-1">
            {expiringSoon.map((d, i) => {
              const req = requirements.find((r: any) => r.document_types?.id === d.document_type_id);
              const name = (req as any)?.document_types?.name ?? "Document";
              const daysLeft = Math.ceil((new Date(d.expiration_date!).getTime() - new Date(today).getTime()) / 86400000);
              return (
                <p key={i} className="text-sm text-amber-800">
                  • <strong>{name}</strong> — expires {d.expiration_date} ({daysLeft} day{daysLeft !== 1 ? "s" : ""} left)
                  <Link href="/documents/new" className="ml-2 text-xs font-semibold text-amber-700 hover:underline">Renew →</Link>
                </p>
              );
            })}
          </div>
        </div>
      )}

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
            {requirements.map((req: any) => {
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
            {requirements.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400">No requirements configured. Add document types in your compliance settings.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
