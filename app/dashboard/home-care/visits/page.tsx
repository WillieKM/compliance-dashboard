import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const navy = "#1a3a52";
const gold = "#d4a574";

const STATUS_STYLE: Record<string, string> = {
  active:    "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  no_show:   "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
};

async function getVisitsData(facilityId: string) {
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error } = await db
      .from("care_visits")
      .select("id, caregiver_name, client_name, clock_in_time, clock_out_time, status, duration_minutes")
      .eq("facility_id", facilityId)
      .order("clock_in_time", { ascending: false })
      .limit(100);
    if (error) return { visits: [], error: error.message };
    return { visits: data ?? [], error: null };
  } catch (e: any) {
    return { visits: [], error: e?.message ?? "Unknown error" };
  }
}

export default async function VisitsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { visits, error } = await getVisitsData(profile.facility_id);
  const orgSlug = profile.organizations?.slug ?? null;
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const today   = new Date().toISOString().split("T")[0];

  const active     = visits.filter(v => v.status === "active").length;
  const todayCount = visits.filter(v => v.clock_in_time?.startsWith(today)).length;

  async function forceClockOut(formData: FormData) {
    "use server";
    try {
      const visitId = String(formData.get("visit_id"));
      const now = new Date().toISOString();
      const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: v } = await db.from("care_visits").select("clock_in_time").eq("id", visitId).single();
      const mins = v?.clock_in_time
        ? Math.round((new Date(now).getTime() - new Date(v.clock_in_time).getTime()) / 60000)
        : null;
      await db.from("care_visits").update({
        clock_out_time: now, status: "completed", duration_minutes: mins, notes: "Clocked out by admin",
      }).eq("id", visitId);
    } catch {}
    revalidatePath("/dashboard/home-care/visits");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-6 text-white flex items-center justify-between flex-wrap gap-4"
        style={{ background: `linear-gradient(135deg, ${navy}, #274f6e)` }}>
        <div>
          <Link href="/dashboard/home-care" className="text-white/70 text-sm hover:text-white mb-1 inline-block">← Home Care</Link>
          <h1 className="text-2xl font-bold">Care Visits</h1>
          <p className="text-white/70 text-sm mt-0.5">Clock in/out, service reports, ADL tracking</p>
        </div>
        {orgSlug && (
          <div className="flex flex-col gap-2 items-end">
            <Link href={`/portal/${orgSlug}/clock-in`}
              className="px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90"
              style={{ backgroundColor: gold, color: navy }}>
              🕐 Clock In Now
            </Link>
            <code className="text-xs bg-white/10 px-2 py-1 rounded text-white/80">{appUrl}/portal/{orgSlug}/clock-in</code>
          </div>
        )}
      </div>

      {/* Error message if table issue */}
      {error && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">Note: {error}</p>
          <p>If the table is missing, run <code className="bg-white px-1 rounded">supabase/create_care_visits_table.sql</code></p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active Visits",   value: active,      cls: active > 0 ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-white border-slate-200 text-slate-700" },
          { label: "Today's Visits",  value: todayCount,  cls: "bg-white border-slate-200 text-slate-700" },
          { label: "Total on File",   value: visits.length, cls: "bg-white border-slate-200 text-slate-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs font-semibold mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Active visits with admin clock-out */}
      {active > 0 && (
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
          <p className="font-bold text-blue-900 mb-2">🟢 {active} staff currently clocked in</p>
          <div className="space-y-2">
            {visits.filter(v => v.status === "active").map(v => (
              <div key={v.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-blue-100">
                <div>
                  <span className="font-semibold text-slate-900 text-sm">{v.caregiver_name}</span>
                  {v.client_name && <span className="text-slate-500 text-xs ml-2">→ {v.client_name}</span>}
                  <p className="text-xs text-blue-600 mt-0.5">
                    Since {new Date(v.clock_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <form action={forceClockOut}>
                  <input type="hidden" name="visit_id" value={v.id} />
                  <button type="submit" className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-lg font-semibold">
                    🔴 Clock Out
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visit log */}
      {visits.length === 0 && !error ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">🕐</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No visits recorded yet</h3>
          <p className="text-slate-500 mb-4">Share the clock-in link with your caregivers.</p>
          {orgSlug && (
            <Link href={`/portal/${orgSlug}/clock-in`}
              className="inline-block px-6 py-2.5 rounded-lg text-white font-bold text-sm"
              style={{ backgroundColor: navy }}>
              Open Clock In
            </Link>
          )}
        </div>
      ) : visits.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ backgroundColor: navy }}>
            <h2 className="font-bold text-white">Visit Log ({visits.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 text-left font-semibold text-slate-600">Caregiver</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Client</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Date</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Time In</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Duration</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="p-3 text-right font-semibold text-slate-600">Detail</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v, i) => {
                  const cin = v.clock_in_time ? new Date(v.clock_in_time) : null;
                  return (
                    <tr key={v.id} className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                      <td className="p-3 font-semibold text-slate-900">{v.caregiver_name || "—"}</td>
                      <td className="p-3 text-slate-600">{v.client_name || "—"}</td>
                      <td className="p-3 text-slate-600">{cin ? cin.toLocaleDateString() : "—"}</td>
                      <td className="p-3 text-slate-600">{cin ? cin.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                      <td className="p-3 text-slate-600">{v.duration_minutes ? `${Math.floor(v.duration_minutes / 60)}h ${v.duration_minutes % 60}m` : "—"}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLE[v.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Link href={`/dashboard/home-care/visits/${v.id}`} className="text-xs font-semibold hover:underline" style={{ color: navy }}>
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
