import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { formatDate, dueDateBadge, WA_COLORS } from "@/lib/compliance/waComplianceUtils";

export const dynamic = "force-dynamic";

const TRAINING_LABELS: Record<string, string> = {
  orientation:             "Orientation",
  infection_control:       "Infection Control",
  bloodborne_pathogen:     "Bloodborne Pathogen",
  tb:                      "TB",
  mandatory_reporter:      "Mandatory Reporter",
  emergency_preparedness:  "Emergency Preparedness",
  food_safety:             "Food Safety",
  client_specific:         "Client-Specific",
  annual_inservice:        "Annual In-Service",
  other:                   "Other",
};

export default async function TrainingPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const fid = profile.facility_id;

  const { data: records } = await supabase
    .from("training_records")
    .select("*")
    .eq("facility_id", fid)
    .order("training_date", { ascending: false });

  const { data: staff } = await supabase
    .from("staff")
    .select("id, first_name, last_name")
    .eq("facility_id", fid);

  const allRecords = records ?? [];
  const today = new Date().toISOString().split("T")[0];

  // Expiring certifications
  const expiringCerts = allRecords.filter((r) => {
    if (!r.certification_expiration) return false;
    const d = Math.ceil((new Date(r.certification_expiration).getTime() - new Date().getTime()) / 86400000);
    return d >= 0 && d <= 60;
  });

  const expiredCerts = allRecords.filter((r) =>
    r.certification_expiration && r.certification_expiration < today
  );

  // Summary by training type
  const byType: Record<string, number> = {};
  allRecords.forEach((r) => {
    byType[r.training_type] = (byType[r.training_type] ?? 0) + 1;
  });

  // Group by employee
  const byEmployee: Record<string, typeof allRecords> = {};
  allRecords.forEach((r) => {
    if (!byEmployee[r.employee_name]) byEmployee[r.employee_name] = [];
    byEmployee[r.employee_name].push(r);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: WA_COLORS.navy }}>Training Logs</h1>
          <p className="text-slate-500 text-sm mt-0.5">WAC 246-335-080 · Mandatory training tracking</p>
        </div>
        <Link
          href="/compliance/training/new"
          className="px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90"
          style={{ backgroundColor: WA_COLORS.navy }}
        >
          + Log Training
        </Link>
      </div>

      {/* Alerts */}
      {(expiredCerts.length > 0 || expiringCerts.length > 0) && (
        <div className="space-y-3">
          {expiredCerts.length > 0 && (
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
              <p className="font-bold text-red-900">🔴 {expiredCerts.length} expired certification{expiredCerts.length > 1 ? "s" : ""}</p>
              <div className="mt-2 space-y-1">
                {expiredCerts.map((r) => (
                  <p key={r.id} className="text-sm text-red-800">
                    • {r.employee_name} — {TRAINING_LABELS[r.training_type] ?? r.training_type} ({r.training_topic}) expired {formatDate(r.certification_expiration)}
                  </p>
                ))}
              </div>
            </div>
          )}
          {expiringCerts.length > 0 && (
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
              <p className="font-bold text-amber-900">⚠ {expiringCerts.length} certification{expiringCerts.length > 1 ? "s" : ""} expiring within 60 days</p>
              <div className="mt-2 space-y-1">
                {expiringCerts.map((r) => (
                  <p key={r.id} className="text-sm text-amber-800">
                    • {r.employee_name} — {r.training_topic} expires {formatDate(r.certification_expiration)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
          <p className="text-3xl font-bold" style={{ color: WA_COLORS.navy }}>{allRecords.length}</p>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Total Records</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-emerald-600">{Object.keys(byEmployee).length}</p>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Staff Trained</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-red-600">{expiredCerts.length}</p>
          <p className="text-xs text-red-600 mt-1 uppercase tracking-wide font-semibold">Expired Certs</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-amber-600">{expiringCerts.length}</p>
          <p className="text-xs text-amber-600 mt-1 uppercase tracking-wide font-semibold">Expiring Soon</p>
        </div>
      </div>

      {/* All records table */}
      {allRecords.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">📚</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No training records yet</h3>
          <p className="text-slate-500 mb-4">Log staff training to track WAC 246-335-080 compliance.</p>
          <Link href="/compliance/training/new" className="inline-block px-6 py-2.5 rounded-lg text-white font-bold text-sm" style={{ backgroundColor: WA_COLORS.navy }}>
            + Log First Training
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ backgroundColor: WA_COLORS.navy }}>
            <h2 className="font-bold text-white">All Training Records</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 text-left font-semibold text-slate-600">Employee</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Training Type</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Topic</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Date</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Provider</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Cert Expires</th>
                </tr>
              </thead>
              <tbody>
                {allRecords.map((r, i) => (
                  <tr key={r.id} className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                    <td className="p-3 font-semibold text-slate-900">{r.employee_name}</td>
                    <td className="p-3">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {TRAINING_LABELS[r.training_type] ?? r.training_type}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700">{r.training_topic}</td>
                    <td className="p-3 text-slate-700">{formatDate(r.training_date)}</td>
                    <td className="p-3 text-slate-500">{r.provider || "—"}</td>
                    <td className="p-3">
                      {r.certification_expiration ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dueDateBadge(r.certification_expiration, 60)}`}>
                          {formatDate(r.certification_expiration)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">No cert</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
