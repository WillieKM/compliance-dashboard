import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const amber = "#b45309";

export default async function NewResidencyAgreementPage({
  searchParams,
}: {
  searchParams: Promise<{ resident_id?: string }>;
}) {
  const { resident_id } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: residents } = await supabase
    .from("residents")
    .select("id, first_name, last_name")
    .eq("facility_id", profile.facility_id)
    .order("first_name");

  const preselected = residents?.find((r) => r.id === resident_id);

  async function save(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;
    const client = await createClient();
    const resId = String(formData.get("resident_id") || "");
    const res = residents?.find((r) => r.id === resId);
    await client.from("afh_residency_agreements").insert({
      facility_id:           p.facility_id,
      resident_id:           resId || null,
      resident_name:         String(formData.get("resident_name") || (res ? `${res.first_name} ${res.last_name}` : "")),
      medicaid_resident:     formData.get("medicaid_resident") === "on",
      agreement_date:        String(formData.get("agreement_date") || "") || null,
      signed_by_resident:    formData.get("signed_by_resident") === "on",
      signed_by_provider:    formData.get("signed_by_provider") === "on",
      legal_notice_provided: formData.get("legal_notice_provided") === "on",
      notes:                 String(formData.get("notes") || "") || null,
    });
    redirect("/dashboard/afh/residency-agreements");
  }

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500";
  const chk = "flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/afh/residency-agreements" className="text-sm hover:underline" style={{ color: amber }}>
          ← Residency Agreements
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">New Residency Agreement</h1>
        <p className="text-slate-500 text-sm mt-1">
          WAC 388-76 · HCBS Medicaid requirement · Effective Jan 1, 2026
        </p>
      </div>

      <form action={save} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Resident</label>
            <select name="resident_id" className={inp} defaultValue={resident_id ?? ""}>
              <option value="">— Select resident —</option>
              {residents?.map((r) => (
                <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Resident Name *</label>
            <input
              type="text" name="resident_name" required
              defaultValue={preselected ? `${preselected.first_name} ${preselected.last_name}` : ""}
              placeholder="Full name" className={inp}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Agreement Date</label>
            <input type="date" name="agreement_date" defaultValue={new Date().toISOString().split("T")[0]} className={inp} />
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <h3 className="font-bold text-slate-800 mb-3">Agreement Status</h3>
          <label className={chk}>
            <input type="checkbox" name="medicaid_resident" className="w-5 h-5 mt-0.5 accent-amber-600" />
            <span className="text-sm font-medium text-slate-700">Medicaid resident <span className="font-normal text-slate-500">(written agreement required under HCBS rule)</span></span>
          </label>
          <label className={chk}>
            <input type="checkbox" name="signed_by_resident" className="w-5 h-5 mt-0.5 accent-amber-600" />
            <span className="text-sm font-medium text-slate-700">Signed by resident (or legal representative)</span>
          </label>
          <label className={chk}>
            <input type="checkbox" name="signed_by_provider" className="w-5 h-5 mt-0.5 accent-amber-600" />
            <span className="text-sm font-medium text-slate-700">Signed by AFH provider</span>
          </label>
          <label className={`${chk} border-amber-200 bg-amber-50`}>
            <input type="checkbox" name="legal_notice_provided" className="w-5 h-5 mt-0.5 accent-amber-600" />
            <span className="text-sm font-medium text-amber-900">Written notice of right to legal assistance provided <span className="font-normal text-amber-700">(required for Medicaid residents on transfer or discharge)</span></span>
          </label>
        </div>

        <div className="border-t pt-4">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
          <textarea name="notes" rows={3} placeholder="Additional notes, e.g. document location, special terms..." className={`${inp} resize-none`} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-8 py-3 rounded-xl text-white font-bold hover:opacity-90" style={{ backgroundColor: amber }}>
            Save Agreement
          </button>
          <Link href="/dashboard/afh/residency-agreements" className="px-6 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
