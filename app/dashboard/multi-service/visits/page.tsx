import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const teal = "#0f766e";

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const STATUS_STYLE: Record<string, string> = {
  active:    "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  no_show:   "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
};

export default async function MultiServiceVisitsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const db = adminClient();
  const { data } = await db
    .from("care_visits")
    .select("id, caregiver_name, client_name, clock_in_time, clock_out_time, status, duration_minutes")
    .eq("facility_id", profile.facility_id)
    .order("clock_in_time", { ascending: false })
    .limit(100);

  const visits = data ?? [];
  const today  = new Date().toISOString().split("T")[0];
  const active     = visits.filter(v => v.status === "active");
  const todayCount = visits.filter(v => v.clock_in_time?.startsWith(today)).length;

  async function forceClockOut(formData: FormData) {
    "use server";
    const visitId = String(formData.get("visit_id"));
    const now = new Date().toISOString();
    const db2 = adminClient();
    const { data: v } = await db2.from("care_visits").select("clock_in_time").eq("id", visitId).single();
    const mins = v?.clock_in_time ? Math.round((new Date(now).getTime() - new Date(v.clock_in_time).getTime()) / 60000) : null;
    await db2.from("care_visits").update({ clock_out_time: now, status: "completed", duration_minutes: mins, notes: "Clocked out by admin" }).eq("id", visitId);
    revalidatePath("/dashboard/multi-service/visits");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 text-white" style={{ background: `linear-gradient(135deg, ${teal}, #0d9488)` }}>
        <Link href="/dashboard/multi-service" className="text-white/70 text-sm hover:text-white mb-1 inline-block">← Multi-Service</Link>
        <h1 className="text-2xl font-bold">Care Visits</h1>
        <p className="text-white/70 text-sm mt-0.5">All visit clock-in/out records across service lines</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Visits",  value: visits.length,  cls: "bg-white border-slate-200 text-slate-700" },
          { label: "Today",         value: todayCount,     cls: todayCount   > 0 ? "bg-teal-50 border-teal-200 text-teal-800"    : "bg-white border-slate-200 text-slate-700" },
          { label: "Active Now",    value: active.length,  cls: active.length > 0 ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-white border-slate-200 text-slate-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs font-semibold mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {visits.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">🕐</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No visits yet</h3>
          <p className="text-slate-500">Visits appear here when caregivers clock in via the staff portal.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ backgroundColor: teal }}>
            <h2 className="font-bold text-white">Visit History ({visits.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-600">Caregiver</th>
                <th className="p-3 text-left font-semibold text-slate-600">Client</th>
                <th className="p-3 text-left font-semibold text-slate-600">Clock In</th>
                <th className="p-3 text-left font-semibold text-slate-600">Clock Out</th>
                <th className="p-3 text-left font-semibold text-slate-600">Duration</th>
                <th className="p-3 text-left font-semibold text-slate-600">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {visits.map((v, i) => (
                <tr key={v.id} className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                  <td className="p-3 font-semibold text-slate-900">{v.caregiver_name || "—"}</td>
                  <td className="p-3 text-slate-600">{v.client_name || "—"}</td>
                  <td className="p-3 text-slate-600 text-xs">{v.clock_in_time ? new Date(v.clock_in_time).toLocaleString() : "—"}</td>
                  <td className="p-3 text-slate-600 text-xs">{v.clock_out_time ? new Date(v.clock_out_time).toLocaleString() : "—"}</td>
                  <td className="p-3 text-slate-600">{v.duration_minutes ? `${v.duration_minutes}m` : "—"}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLE[v.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {v.status === "active" && (
                      <form action={forceClockOut}>
                        <input type="hidden" name="visit_id" value={v.id} />
                        <button type="submit" className="text-xs bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-2 py-1 rounded-lg font-semibold">Clock Out</button>
                      </form>
                    )}
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
