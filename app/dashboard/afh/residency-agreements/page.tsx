import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const amber = "#b45309";

export default async function AFHResidencyAgreementsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const [{ data: agreements }, { data: residents }] = await Promise.all([
    supabase
      .from("afh_residency_agreements")
      .select("*")
      .eq("facility_id", profile.facility_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("residents")
      .select("id, first_name, last_name")
      .eq("facility_id", profile.facility_id)
      .order("first_name"),
  ]);

  const all = agreements ?? [];
  const allResidents = residents ?? [];

  // Set of resident_ids that already have an agreement
  const residentIdsWithAgreement = new Set(
    all.map((a) => a.resident_id).filter(Boolean)
  );

  const residentsWithoutAgreement = allResidents.filter(
    (r) => !residentIdsWithAgreement.has(r.id)
  );

  const totalAgreements = all.length;
  const medicaidAgreements = all.filter((a) => a.medicaid_resident).length;
  const missingCount = residentsWithoutAgreement.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link
            href="/dashboard/afh"
            className="text-sm hover:underline"
            style={{ color: amber }}
          >
            ← AFH Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Residency Agreements
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            WAC 388-76 · HCBS Medicaid requirement · Effective Jan 1, 2026
          </p>
        </div>
        <Link
          href="/dashboard/afh/residency-agreements/new"
          className="px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90"
          style={{ backgroundColor: amber }}
        >
          + New Residency Agreement
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Agreements",
            count: totalAgreements,
            cls: "bg-amber-50 border-amber-200 text-amber-800",
          },
          {
            label: "Medicaid Agreements",
            count: medicaidAgreements,
            cls: "bg-amber-50 border-amber-200 text-amber-800",
          },
          {
            label: "Missing",
            count: missingCount,
            cls:
              missingCount > 0
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-800",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border-2 p-4 text-center ${s.cls}`}
          >
            <p className="text-3xl font-bold">{s.count}</p>
            <p className="text-xs font-semibold mt-1 uppercase tracking-wide">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Alert: residents without any agreement */}
      {residentsWithoutAgreement.length > 0 && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <p className="font-bold text-amber-900 mb-2">
            ⚠ {residentsWithoutAgreement.length} resident
            {residentsWithoutAgreement.length > 1 ? "s" : ""} without a
            residency agreement on file
          </p>
          <p className="text-sm text-amber-800 mb-3">
            WAC 388-76 requires a written residency agreement with every
            Medicaid resident. Ensure all residents have a signed agreement on
            file.
          </p>
          <div className="flex flex-wrap gap-2">
            {residentsWithoutAgreement.map((r) => (
              <Link
                key={r.id}
                href={`/dashboard/afh/residency-agreements/new?resident_id=${r.id}`}
                className="text-sm bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-amber-800 hover:bg-amber-100 font-medium"
              >
                {r.first_name} {r.last_name} — New Agreement →
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Agreements table */}
      {all.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">📄</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">
            No residency agreements on file
          </h3>
          <p className="text-slate-500 mb-4">
            WAC 388-76 requires a written residency agreement with every
            Medicaid resident, effective January 1, 2026.
          </p>
          <Link
            href="/dashboard/afh/residency-agreements/new"
            className="inline-block px-6 py-2.5 rounded-lg text-white font-bold text-sm"
            style={{ backgroundColor: amber }}
          >
            Add First Agreement
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ backgroundColor: amber }}>
            <h2 className="font-bold text-white">
              All Residency Agreements ({all.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 text-left font-semibold text-slate-600">
                    Resident
                  </th>
                  <th className="p-3 text-left font-semibold text-slate-600">
                    Medicaid
                  </th>
                  <th className="p-3 text-left font-semibold text-slate-600">
                    Agreement Date
                  </th>
                  <th className="p-3 text-left font-semibold text-slate-600">
                    Signed by Resident
                  </th>
                  <th className="p-3 text-left font-semibold text-slate-600">
                    Signed by Provider
                  </th>
                  <th className="p-3 text-left font-semibold text-slate-600">
                    Legal Notice
                  </th>
                </tr>
              </thead>
              <tbody>
                {all.map((a, i) => (
                  <tr
                    key={a.id}
                    className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}
                  >
                    <td className="p-3 font-semibold text-slate-900">
                      {a.resident_name}
                    </td>
                    <td className="p-3">
                      {a.medicaid_resident ? (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                          Medicaid
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Private</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600">
                      {a.agreement_date
                        ? new Date(a.agreement_date).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )
                        : "—"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          a.signed_by_resident
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {a.signed_by_resident ? "✓ Yes" : "✕ No"}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          a.signed_by_provider
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {a.signed_by_provider ? "✓ Yes" : "✕ No"}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          a.legal_notice_provided
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {a.legal_notice_provided ? "✓ Provided" : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WAC reference box */}
      <div className="rounded-xl p-4 text-sm bg-amber-50 border border-amber-200">
        <p className="font-bold text-amber-900 mb-1">
          WAC 388-76 — HCBS Medicaid Requirements (Effective Jan 1, 2026)
        </p>
        <ul className="text-amber-800 space-y-0.5">
          <li>
            • AFH must have a written residency agreement with every Medicaid
            resident
          </li>
          <li>
            • Agreements must include eviction/transfer protections
          </li>
          <li>
            • On any transfer or discharge notice, providers must give written
            notice of the resident&apos;s right to legal assistance
          </li>
          <li>
            • Non-compliance may jeopardize Medicaid HCBS participation
          </li>
        </ul>
      </div>
    </div>
  );
}
