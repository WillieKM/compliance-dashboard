import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function SuperAdminPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.is_super_admin) redirect("/dashboard");

  const db = admin();

  const [orgsRes, invitesRes, profilesRes] = await Promise.all([
    db.from("organizations").select("id, name, slug, primary_color, logo_url, care_settings, created_at").order("created_at", { ascending: false }),
    db.from("invite_codes").select("id, code, created_for, care_setting, used, used_by, expires_at, created_at").order("created_at", { ascending: false }),
    db.from("profiles").select("id, full_name, organization_id, created_at").order("created_at", { ascending: false }),
  ]);

  const orgs     = orgsRes.data ?? [];
  const invites  = invitesRes.data ?? [];
  const profiles = profilesRes.data ?? [];

  const activeInvites = invites.filter(i => !i.used && (!i.expires_at || new Date(i.expires_at) > new Date()));
  const usedInvites   = invites.filter(i => i.used);

  const CARE_LABEL: Record<string, string> = {
    HOME_CARE: "🏥 Home Care", AFH: "🏠 AFH",
    ASSISTED_LIVING: "🏢 Assisted Living", MULTI_SERVICE: "🌐 Multi-Service",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white px-8 py-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">CareCompliance Platform</p>
          <h1 className="text-2xl font-bold">Super Admin</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/super-admin/companies" className="text-sm text-slate-400 hover:text-white">Companies →</Link>
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">← Your Dashboard</Link>
          <span className="text-xs bg-yellow-500 text-slate-900 font-bold px-2 py-1 rounded-full">PLATFORM OWNER</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Companies",   value: orgs.length,           cls: "bg-blue-600" },
            { label: "Total Users",        value: profiles.length,       cls: "bg-emerald-600" },
            { label: "Active Invites",     value: activeInvites.length,  cls: "bg-amber-500" },
            { label: "Invites Used",       value: usedInvites.length,    cls: "bg-slate-600" },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-5 text-white ${s.cls}`}>
              <p className="text-4xl font-bold">{s.value}</p>
              <p className="text-sm opacity-80 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* All Companies */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-slate-800 flex items-center justify-between">
            <h2 className="font-bold text-white">All Companies ({orgs.length})</h2>
            <Link href="/admin/invites" className="text-xs font-bold bg-yellow-500 text-slate-900 px-3 py-1.5 rounded-lg hover:bg-yellow-400">
              + Generate Invite
            </Link>
          </div>
          {orgs.length === 0 ? (
            <p className="text-center text-slate-400 py-10">No companies signed up yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {orgs.map(org => {
                const orgProfiles = profiles.filter(p => p.organization_id === org.id);
                const careSettings: string[] = org.care_settings ?? [];
                return (
                  <div key={org.id} className="flex items-center gap-4 p-4 hover:bg-slate-50">
                    {org.logo_url
                      ? <img src={org.logo_url} alt="" className="h-10 w-10 rounded-xl object-contain border border-slate-200 bg-slate-50 p-1 shrink-0" />
                      : <div className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0"
                          style={{ backgroundColor: org.primary_color ?? "#1a3a52" }}>
                          {org.name.slice(0, 2).toUpperCase()}
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900">{org.name}</p>
                        {org.slug && <code className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">/{org.slug}</code>}
                      </div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {careSettings.map(s => (
                          <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                            {CARE_LABEL[s] ?? s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-slate-700">{orgProfiles.length} user{orgProfiles.length !== 1 ? "s" : ""}</p>
                      <p className="text-xs text-slate-400">{new Date(org.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Invite codes overview */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-slate-800 flex items-center justify-between">
            <h2 className="font-bold text-white">Invite Codes</h2>
            <Link href="/admin/invites" className="text-xs text-slate-300 hover:text-white">Manage all →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            <div className="p-5">
              <h3 className="text-sm font-bold text-emerald-700 mb-3">Active ({activeInvites.length})</h3>
              {activeInvites.length === 0
                ? <p className="text-sm text-slate-400">No active codes</p>
                : activeInvites.slice(0, 5).map(inv => (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <code className="font-mono font-bold text-slate-900 text-sm">{inv.code}</code>
                      <p className="text-xs text-slate-500">{inv.created_for}</p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {inv.expires_at ? `exp ${new Date(inv.expires_at).toLocaleDateString()}` : "no expiry"}
                    </span>
                  </div>
                ))
              }
            </div>
            <div className="p-5">
              <h3 className="text-sm font-bold text-slate-600 mb-3">Recently Used ({usedInvites.length})</h3>
              {usedInvites.length === 0
                ? <p className="text-sm text-slate-400">No codes used yet</p>
                : usedInvites.slice(0, 5).map(inv => (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <code className="font-mono font-bold text-slate-400 line-through text-sm">{inv.code}</code>
                      <p className="text-xs text-slate-500">{inv.created_for}</p>
                    </div>
                    <span className="text-xs text-slate-400">{inv.used_by}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* Recent signups */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-slate-800">
            <h2 className="font-bold text-white">Recent Users ({profiles.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-600">Name</th>
                <th className="p-3 text-left font-semibold text-slate-600">Company</th>
                <th className="p-3 text-left font-semibold text-slate-600">Joined</th>
              </tr>
            </thead>
            <tbody>
              {profiles.slice(0, 10).map((p, i) => {
                const org = orgs.find(o => o.id === p.organization_id);
                return (
                  <tr key={p.id} className={`border-b ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                    <td className="p-3 font-medium text-slate-900">{p.full_name ?? "—"}</td>
                    <td className="p-3 text-slate-600">{org?.name ?? "—"}</td>
                    <td className="p-3 text-slate-400 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
