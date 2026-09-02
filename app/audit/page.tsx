import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const ENTITY_ICONS: Record<string, string> = {
  incident:       "⚠️",
  care_plan:      "📋",
  medication_log: "💊",
  note:           "📝",
  resident:       "🏠",
  staff:          "👤",
  document:       "📄",
  safety:         "🔬",
  default:        "🔹",
};

const ACTION_COLORS: Record<string, string> = {
  created:    "bg-emerald-100 text-emerald-700",
  updated:    "bg-blue-100 text-blue-700",
  deleted:    "bg-red-100 text-red-700",
  cleared:    "bg-purple-100 text-purple-700",
  signed_off: "bg-teal-100 text-teal-700",
  logged:     "bg-amber-100 text-amber-700",
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; days?: string }>;
}) {
  const { entity, days } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const daysBack = Math.min(parseInt(days ?? "30", 10) || 30, 90);
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  let query = admin()
    .from("audit_logs")
    .select("id, user_name, action, entity_type, entity_id, entity_name, details, created_at")
    .eq("facility_id", profile.facility_id)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(200);

  if (entity && entity !== "all") {
    query = query.eq("entity_type", entity);
  }

  const { data: logs } = await query;
  const entries = logs ?? [];

  function fmtTime(s: string) {
    const d = new Date(s);
    return d.toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  const entityTypes = ["all", "incident", "care_plan", "note", "medication_log", "resident", "staff", "document", "safety"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Trail</h1>
          <p className="text-slate-500 text-sm mt-0.5">Activity log — who did what, and when</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-600">Type:</label>
          <div className="flex gap-1 flex-wrap">
            {entityTypes.map(t => (
              <Link
                key={t}
                href={`?entity=${t}&days=${daysBack}`}
                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors ${
                  (entity ?? "all") === t
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t === "all" ? "All" : t.replace("_", " ")}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-sm font-semibold text-slate-600">Range:</label>
          {[7, 30, 90].map(d => (
            <Link
              key={d}
              href={`?entity=${entity ?? "all"}&days=${d}`}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                daysBack === d
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {d}d
            </Link>
          ))}
        </div>
      </div>

      {/* Stat */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-slate-900">{entries.length}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Events ({daysBack}d)</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-slate-900">{new Set(entries.map(e => e.user_name).filter(Boolean)).size}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Staff Members</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-slate-900">{entries.filter(e => e.action === "deleted").length}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Deletions</p>
        </div>
      </div>

      {/* Log */}
      {entries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">📋</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No activity logged yet</h3>
          <p className="text-slate-500 text-sm">Events appear here as staff take actions in the platform.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-slate-800">
            <h2 className="font-bold text-white">Activity Log ({entries.length} events)</h2>
          </div>
          <div className="divide-y">
            {entries.map(e => {
              const icon = ENTITY_ICONS[e.entity_type] ?? ENTITY_ICONS.default;
              const actionCls = ACTION_COLORS[e.action] ?? "bg-slate-100 text-slate-600";
              return (
                <div key={e.id} className="px-5 py-3 flex items-start gap-4 hover:bg-slate-50">
                  <span className="text-xl mt-0.5 shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${actionCls}`}>
                        {e.action}
                      </span>
                      <span className="text-xs text-slate-500 capitalize">{e.entity_type.replace("_", " ")}</span>
                      {e.entity_name && (
                        <span className="text-sm font-medium text-slate-800 truncate">{e.entity_name}</span>
                      )}
                    </div>
                    {e.user_name && (
                      <p className="text-xs text-slate-400 mt-0.5">by {e.user_name}</p>
                    )}
                    {e.details && Object.keys(e.details).length > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {Object.entries(e.details as Record<string, unknown>)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <time className="text-xs text-slate-400 shrink-0">{fmtTime(e.created_at)}</time>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
