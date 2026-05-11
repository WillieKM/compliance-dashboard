import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const amber = "#b45309";

export default async function FireDrillsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: drills } = await supabase
    .from("fire_drills")
    .select("*")
    .eq("facility_id", profile.facility_id)
    .order("drill_date", { ascending: false });

  const all = drills ?? [];
  const today = new Date();
  const thisYear = today.getFullYear();
  const thisMonth = today.getMonth();

  // Check monthly compliance — need at least 1 drill per month
  const drillsThisMonth = all.filter(d => {
    const date = new Date(d.drill_date);
    return date.getFullYear() === thisYear && date.getMonth() === thisMonth;
  });

  const lastDrill = all[0];
  const daysSinceLastDrill = lastDrill
    ? Math.floor((today.getTime() - new Date(lastDrill.drill_date).getTime()) / 86400000)
    : null;

  const overdue = daysSinceLastDrill === null || daysSinceLastDrill > 31;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href="/dashboard/afh" className="text-sm hover:underline" style={{ color: amber }}>← AFH Dashboard</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Fire & Disaster Drill Log</h1>
          <p className="text-slate-500 text-sm mt-0.5">WAC 388-76-10660 · Monthly drills required</p>
        </div>
        <Link href="/dashboard/afh/fire-drills/new"
          className="px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90"
          style={{ backgroundColor: amber }}>
          + Log Drill
        </Link>
      </div>

      {/* Status banner */}
      <div className={`rounded-xl border-2 p-5 ${overdue ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className={`font-bold text-lg ${overdue ? "text-red-900" : "text-emerald-900"}`}>
              {overdue ? "🔴 Drill Overdue" : "🟢 Drill Current"}
            </p>
            <p className={`text-sm mt-1 ${overdue ? "text-red-700" : "text-emerald-700"}`}>
              {daysSinceLastDrill === null
                ? "No drills on record — first drill required immediately"
                : `Last drill: ${daysSinceLastDrill} days ago (${new Date(lastDrill.drill_date).toLocaleDateString()})`}
            </p>
            <p className={`text-xs mt-0.5 ${overdue ? "text-red-600" : "text-emerald-600"}`}>
              This month: {drillsThisMonth.length} drill{drillsThisMonth.length !== 1 ? "s" : ""} logged
            </p>
          </div>
          {overdue && (
            <Link href="/dashboard/afh/fire-drills/new"
              className="px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90 bg-red-600">
              Log Drill Now →
            </Link>
          )}
        </div>
      </div>

      {/* Drill history */}
      {all.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">🔥</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No drills logged yet</h3>
          <p className="text-slate-500 mb-4">WAC 388-76-10660 requires monthly fire and disaster drills. Log your first drill to start tracking.</p>
          <Link href="/dashboard/afh/fire-drills/new"
            className="inline-block px-6 py-2.5 rounded-lg text-white font-bold text-sm"
            style={{ backgroundColor: amber }}>
            Log First Drill
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ backgroundColor: amber }}>
            <h2 className="font-bold text-white">Drill History ({all.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-600">Date</th>
                <th className="p-3 text-left font-semibold text-slate-600">Type</th>
                <th className="p-3 text-left font-semibold text-slate-600">Time</th>
                <th className="p-3 text-left font-semibold text-slate-600">Participants</th>
                <th className="p-3 text-left font-semibold text-slate-600">Evacuation</th>
                <th className="p-3 text-left font-semibold text-slate-600">Conducted By</th>
                <th className="p-3 text-left font-semibold text-slate-600">All Accounted</th>
              </tr>
            </thead>
            <tbody>
              {all.map((drill, i) => (
                <tr key={drill.id} className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                  <td className="p-3 font-semibold text-slate-900">
                    {new Date(drill.drill_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="p-3">
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium capitalize">
                      {drill.drill_type}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">{drill.drill_time || "—"}</td>
                  <td className="p-3 text-slate-600">{drill.participants_count || "—"}</td>
                  <td className="p-3 text-slate-600">
                    {drill.evacuation_time_seconds ? `${drill.evacuation_time_seconds}s` : "—"}
                  </td>
                  <td className="p-3 text-slate-600">{drill.conducted_by || "—"}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${drill.all_residents_accounted ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {drill.all_residents_accounted ? "✓ Yes" : "✕ No"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl p-4 text-sm bg-amber-50 border border-amber-200">
        <p className="font-bold text-amber-900 mb-1">WAC 388-76-10660 Requirements</p>
        <ul className="text-amber-800 space-y-0.5">
          <li>• Monthly fire drills required for all AFH facilities</li>
          <li>• All residents and staff must participate</li>
          <li>• Evacuation time must be documented</li>
          <li>• Issues noted must include corrective action plan</li>
        </ul>
      </div>
    </div>
  );
}
