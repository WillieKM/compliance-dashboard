import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient as adminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const navy = "#1a3a52";

function admin() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ClientDirectoryPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const [visitsRes, incidentsRes, residentsRes] = await Promise.all([
    // All care visits — used to compute per-client stats
    admin()
      .from("care_visits")
      .select("client_name, clock_in_time, visit_service_reports(id, cleared, fall_occurred, incident_occurred, submitted_at)")
      .eq("facility_id", profile.facility_id)
      .order("clock_in_time", { ascending: false })
      .limit(5000),
    // Formal incidents
    admin()
      .from("home_care_incidents")
      .select("resident_name, incident_date, doh_report_required")
      .eq("facility_id", profile.facility_id)
      .order("incident_date", { ascending: false }),
    // Roster of formal clients (residents table)
    admin()
      .from("residents")
      .select("id, first_name, last_name, status, care_level")
      .eq("facility_id", profile.facility_id)
      .order("first_name"),
  ]);

  type Report = { id: string; cleared: boolean | null; fall_occurred: boolean; incident_occurred: boolean; submitted_at: string };

  // Build per-client stats from care_visits
  const clientMap = new Map<string, {
    lastVisit: string;
    totalNotes: number;
    unsignedNotes: number;
    openFlags: number;
    formalIncidents: number;
    dohRequired: number;
  }>();

  for (const v of visitsRes.data ?? []) {
    const name = v.client_name?.trim();
    if (!name) continue;
    const reports = (v.visit_service_reports as Report[] | null) ?? [];
    if (!clientMap.has(name)) {
      clientMap.set(name, { lastVisit: v.clock_in_time ?? "", totalNotes: 0, unsignedNotes: 0, openFlags: 0, formalIncidents: 0, dohRequired: 0 });
    }
    const c = clientMap.get(name)!;
    if (v.clock_in_time && v.clock_in_time > c.lastVisit) c.lastVisit = v.clock_in_time;
    for (const r of reports) {
      c.totalNotes++;
      if (!r.cleared) c.unsignedNotes++;
      if ((r.fall_occurred || r.incident_occurred) && !r.cleared) c.openFlags++;
    }
  }

  // Add incident data
  for (const inc of incidentsRes.data ?? []) {
    const name = inc.resident_name?.trim();
    if (!name) continue;
    if (!clientMap.has(name)) {
      clientMap.set(name, { lastVisit: "", totalNotes: 0, unsignedNotes: 0, openFlags: 0, formalIncidents: 0, dohRequired: 0 });
    }
    const c = clientMap.get(name)!;
    c.formalIncidents++;
    if (inc.doh_report_required) c.dohRequired++;
  }

  // Sort: clients with open flags first, then by last visit date
  const clients = Array.from(clientMap.entries()).sort((a, b) => {
    const urgA = a[1].openFlags + a[1].dohRequired;
    const urgB = b[1].openFlags + b[1].dohRequired;
    if (urgA !== urgB) return urgB - urgA;
    return (b[1].lastVisit ?? "").localeCompare(a[1].lastVisit ?? "");
  });

  const totalUnsigned = clients.reduce((s, [, c]) => s + c.unsignedNotes, 0);
  const totalFlags    = clients.reduce((s, [, c]) => s + c.openFlags, 0);
  const totalDoh      = clients.reduce((s, [, c]) => s + c.dohRequired, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl text-white px-5 py-4" style={{ background: `linear-gradient(135deg, ${navy}, #274f6e)` }}>
        <Link href="/dashboard/home-care" className="text-white/70 text-sm hover:text-white mb-1 inline-block">
          ← Home Care Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Client Records</h1>
        <p className="text-white/70 text-sm mt-0.5">All clients — tap any name to open their full date-by-date record</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active Clients",   value: clients.length,  cls: "bg-white border-slate-200 text-slate-900" },
          { label: "Notes Unsigned",   value: totalUnsigned,   cls: totalUnsigned > 0 ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-white border-slate-200 text-slate-700" },
          { label: "Open Flags",       value: totalFlags,      cls: totalFlags    > 0 ? "bg-red-50 border-red-200 text-red-800"     : "bg-white border-slate-200 text-slate-700" },
          { label: "DOH Required",     value: totalDoh,        cls: totalDoh      > 0 ? "bg-red-50 border-red-200 text-red-800"     : "bg-emerald-50 border-emerald-200 text-emerald-800" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs font-semibold uppercase tracking-wide mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Client list */}
      {clients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">👥</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No clients on record yet</h3>
          <p className="text-slate-500 text-sm">Clients appear here automatically once caregivers submit notes through the portal.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-slate-50">
            <h2 className="font-bold text-slate-800">All Clients ({clients.length})</h2>
            <p className="text-xs text-slate-400 mt-0.5">Sorted by urgency — clients with open flags first</p>
          </div>

          <div className="divide-y divide-slate-100">
            {clients.map(([name, stats]) => {
              const hasUrgent = stats.openFlags > 0 || stats.dohRequired > 0;
              return (
                <Link
                  key={name}
                  href={`/dashboard/home-care/client-record?name=${encodeURIComponent(name)}`}
                  className={`flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors ${hasUrgent ? "bg-red-50/40" : ""}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white ${hasUrgent ? "bg-red-500" : "bg-slate-400"}`}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{name}</p>
                      <p className="text-xs text-slate-400">
                        {stats.totalNotes} note{stats.totalNotes !== 1 ? "s" : ""}
                        {stats.formalIncidents > 0 ? ` · ${stats.formalIncidents} incident${stats.formalIncidents !== 1 ? "s" : ""}` : ""}
                        {stats.lastVisit ? ` · Last: ${fmtDate(stats.lastVisit)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3 flex-wrap justify-end">
                    {stats.dohRequired > 0 && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">DOH Required</span>
                    )}
                    {stats.openFlags > 0 && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">⚠ {stats.openFlags} flag{stats.openFlags !== 1 ? "s" : ""}</span>
                    )}
                    {stats.unsignedNotes > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">{stats.unsignedNotes} unsigned</span>
                    )}
                    {!hasUrgent && stats.unsignedNotes === 0 && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✓ All clear</span>
                    )}
                    <span className="text-slate-400 text-sm">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
