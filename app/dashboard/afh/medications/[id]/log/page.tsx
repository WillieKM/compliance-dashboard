import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const amber = "#b45309";

export default async function LogAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const [{ data: med }, { data: logs }] = await Promise.all([
    supabase.from("medication_records").select("*").eq("id", id).eq("facility_id", profile.facility_id).maybeSingle(),
    supabase.from("mar_log").select("*").eq("medication_id", id).order("administered_at", { ascending: false }).limit(30),
  ]);

  if (!med) notFound();

  async function logAdministration(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;
    const client = await createClient();
    const given = formData.get("given") !== "not_given";
    await client.from("mar_log").insert({
      facility_id:     p.facility_id,
      medication_id:   id,
      resident_name:   med.resident_name,
      medication_name: med.medication_name,
      administered_at: `${String(formData.get("date"))}T${String(formData.get("time") || "12:00")}:00Z`,
      administered_by: String(formData.get("administered_by")),
      given,
      reason_not_given: !given ? String(formData.get("reason_not_given") || "") : null,
      notes: String(formData.get("notes") || "") || null,
    });
    revalidatePath(`/dashboard/afh/medications/${id}/log`);
  }

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/afh/medications" className="text-sm hover:underline" style={{ color: amber }}>← MAR</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">{med.medication_name}</h1>
        <p className="text-slate-500 text-sm">{med.resident_name} · {med.dosage} · {med.frequency}</p>
        {med.is_controlled && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold mt-1 inline-block">Controlled Substance</span>}
      </div>

      {/* Log new administration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="font-bold text-slate-900 mb-4">Log Administration</h2>
        <form action={logAdministration} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">Date *</label>
            <input type="date" name="date" required defaultValue={new Date().toISOString().split("T")[0]} className={inp} /></div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">Time</label>
            <input type="time" name="time" className={inp} /></div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">Administered By *</label>
            <input type="text" name="administered_by" required placeholder="Staff name" className={inp} /></div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">Status *</label>
            <select name="given" className={inp}>
              <option value="given">Given</option>
              <option value="not_given">Not Given</option>
            </select>
          </div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">Reason Not Given (if applicable)</label>
            <input type="text" name="reason_not_given" placeholder="e.g. Refused, Asleep" className={inp} /></div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
            <input type="text" name="notes" placeholder="Any observations" className={inp} /></div>
          <div className="sm:col-span-2">
            <button type="submit" className="px-6 py-2.5 rounded-lg text-white font-bold text-sm hover:opacity-90" style={{ backgroundColor: amber }}>
              Log Administration
            </button>
          </div>
        </form>
      </div>

      {/* Administration history */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ backgroundColor: amber }}>
          <h2 className="font-bold text-white">Administration History (last 30)</h2>
        </div>
        {!logs?.length ? (
          <p className="text-center text-slate-400 py-8">No administrations logged yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-600">Date / Time</th>
                <th className="p-3 text-left font-semibold text-slate-600">Administered By</th>
                <th className="p-3 text-left font-semibold text-slate-600">Status</th>
                <th className="p-3 text-left font-semibold text-slate-600">Notes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id} className={`border-b ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                  <td className="p-3 text-slate-700">{log.administered_at ? new Date(log.administered_at).toLocaleString() : "—"}</td>
                  <td className="p-3 text-slate-700">{log.administered_by}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${log.given ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {log.given ? "Given" : `Not Given${log.reason_not_given ? ` — ${log.reason_not_given}` : ""}`}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500 text-xs">{log.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
