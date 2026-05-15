import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { createClient as adminClient } from "@supabase/supabase-js";

function admin() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  active:    "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  no_show:   "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
};

const navy = "#1a3a52";
const gold = "#d4a574";

export default async function VisitsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  async function forceClockOut(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;
    const visitId = String(formData.get("visit_id"));
    const now = new Date().toISOString();
    const db = admin();
    const { data: visit } = await db.from("care_visits").select("clock_in_time").eq("id", visitId).single();
    const mins = visit?.clock_in_time
      ? Math.round((new Date(now).getTime() - new Date(visit.clock_in_time).getTime()) / 60000)
      : null;
    await db.from("care_visits").update({
      clock_out_time: now,
      status: "completed",
      duration_minutes: mins,
      notes: "Clocked out by admin",
    }).eq("id", visitId);
    revalidatePath("/dashboard/home-care/visits");
  }

  const supabase = await createClient();
  const fid = profile.facility_id;

  // Gracefully handle missing table
  const { data: visits, error: visitsError } = await supabase
    .from("care_visits")
    .select("*, visit_service_reports(id)")
    .eq("facility_id", fid)
    .order("clock_in_time", { ascending: false })
    .limit(100);

  if (visitsError?.message?.includes("does not exist") || visitsError?.code === "42P01") {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center bg-white rounded-2xl border border-slate-200 p-10 shadow-sm">
        <p className="text-4xl mb-4">🗄️</p>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Database setup needed</h2>
        <p className="text-slate-500 mb-4">Run <code className="bg-slate-100 px-2 py-0.5 rounded text-sm">supabase/create_care_visits_table.sql</code> in your Supabase SQL Editor to enable visit tracking.</p>
      </div>
    );
  }

  const { data: residents } = await supabase
    .from("residents")
    .select("id, first_name, last_name")
    .eq("facility_id", fid)
    .order("first_name");

  const all = visits ?? [];
  const active    = all.filter((v) => v.status === "active").length;
  const today     = all.filter((v) => v.clock_in_time?.startsWith(new Date().toISOString().split("T")[0])).length;
  const withReport = all.filter((v) => v.visit_service_reports?.length > 0).length;

  // Generate shareable clock-in link
  const clockInUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/home-care/visits/clock-in`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-6 text-white flex items-center justify-between flex-wrap gap-4"
        style={{ background: `linear-gradient(135deg, ${navy}, #274f6e)` }}>
        <div>
          <Link href="/dashboard/home-care" className="text-white/70 text-sm hover:text-white mb-1 inline-block">
            ← Home Care
          </Link>
          <h1 className="text-2xl font-bold">Care Visits</h1>
          <p className="text-white/70 text-sm mt-0.5">Clock in/out, service reports, ADL tracking</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <Link
            href="/dashboard/home-care/visits/clock-in"
            className="px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: gold, color: navy }}
          >
            🕐 Clock In Now
          </Link>
          <p className="text-xs text-white/50">Share link with caregivers:</p>
          <code className="text-xs bg-white/10 px-2 py-1 rounded text-white/80 break-all max-w-xs">
            {clockInUrl}
          </code>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active Visits",    value: active,     cls: active > 0 ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-white border-slate-200 text-slate-700" },
          { label: "Today's Visits",   value: today,      cls: "bg-white border-slate-200 text-slate-700" },
          { label: "Reports Submitted",value: withReport, cls: "bg-white border-slate-200 text-slate-700" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs font-semibold mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Active visits alert */}
      {active > 0 && (
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
          <p className="font-bold text-blue-900 mb-2">🟢 {active} staff currently clocked in</p>
          <div className="space-y-2">
            {all.filter((v) => v.status === "active").map((v) => (
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
                  <button type="submit"
                    className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-lg font-semibold transition-colors"
                    onClick={(e) => { if (!confirm(`Clock out ${v.caregiver_name}?`)) e.preventDefault(); }}>
                    🔴 Clock Out
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visits table */}
      {all.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">🕐</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No visits recorded yet</h3>
          <p className="text-slate-500 mb-4">Share the clock-in link with your caregivers to start tracking visits.</p>
          <Link
            href="/dashboard/home-care/visits/clock-in"
            className="inline-block px-6 py-2.5 rounded-lg text-white font-bold text-sm"
            style={{ backgroundColor: navy }}
          >
            Clock In Now
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ backgroundColor: navy }}>
            <h2 className="font-bold text-white">Visit Log</h2>
            <Link
              href="/dashboard/home-care/visits/clock-in"
              className="text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90"
              style={{ backgroundColor: gold, color: navy }}
            >
              + Clock In
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 text-left font-semibold text-slate-600">Caregiver</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Client</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Clock In</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Clock Out</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Duration</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Report</th>
                  <th className="p-3 text-right font-semibold text-slate-600">View</th>
                </tr>
              </thead>
              <tbody>
                {all.map((visit, i) => {
                  const clockIn  = visit.clock_in_time  ? new Date(visit.clock_in_time)  : null;
                  const clockOut = visit.clock_out_time ? new Date(visit.clock_out_time) : null;
                  const mins = visit.duration_minutes ?? (clockIn && clockOut
                    ? Math.round((clockOut.getTime() - clockIn.getTime()) / 60000)
                    : null);
                  const hasReport = visit.visit_service_reports?.length > 0;

                  return (
                    <tr key={visit.id} className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                      <td className="p-3 font-semibold text-slate-900">{visit.caregiver_name || "—"}</td>
                      <td className="p-3 text-slate-700">{visit.client_name || "—"}</td>
                      <td className="p-3 text-slate-700">
                        {clockIn ? (
                          <div>
                            <p>{clockIn.toLocaleDateString()}</p>
                            <p className="text-xs text-slate-400">{clockIn.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="p-3 text-slate-700">
                        {clockOut ? (
                          <div>
                            <p>{clockOut.toLocaleDateString()}</p>
                            <p className="text-xs text-slate-400">{clockOut.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        ) : <span className="text-blue-600 text-xs font-semibold">Still in</span>}
                      </td>
                      <td className="p-3 text-slate-700">
                        {mins ? `${Math.floor(mins / 60)}h ${mins % 60}m` : "—"}
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLE[visit.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {visit.status}
                        </span>
                      </td>
                      <td className="p-3">
                        {hasReport
                          ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">✓ Submitted</span>
                          : <span className="text-xs text-slate-400">Pending</span>}
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/dashboard/home-care/visits/${visit.id}`}
                          className="text-xs font-semibold hover:underline"
                          style={{ color: navy }}
                        >
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
