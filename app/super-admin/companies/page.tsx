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

const CARE_LABEL: Record<string, string> = {
  HOME_CARE: "Home Care", AFH: "AFH",
  ASSISTED_LIVING: "Assisted Living", MULTI_SERVICE: "Multi-Service",
};

const STATUS_STYLE: Record<string, string> = {
  active:    "bg-emerald-100 text-emerald-800",
  trialing:  "bg-blue-100 text-blue-800",
  past_due:  "bg-red-100 text-red-800",
  cancelled: "bg-slate-100 text-slate-500",
  none:      "bg-amber-100 text-amber-700",
};

export default async function CompaniesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.is_super_admin) redirect("/dashboard");

  const db = admin();

  const [orgsRes, subsRes, profilesRes, staffRes, residentsRes] = await Promise.all([
    db.from("organizations").select("id, name, slug, primary_color, logo_url, care_settings, created_at").order("created_at", { ascending: false }),
    db.from("subscriptions").select("organization_id, plan_id, status, stripe_customer_id, updated_at"),
    db.from("profiles").select("id, full_name, organization_id, role, created_at"),
    db.from("staff").select("id, facility_id"),
    db.from("residents").select("id, facility_id, status"),
  ]);

  const orgs      = orgsRes.data ?? [];
  const subs      = subsRes.data ?? [];
  const profiles  = profilesRes.data ?? [];
  const staff     = staffRes.data ?? [];
  const residents = residentsRes.data ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 text-white px-8 py-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">CareCompliance Platform</p>
          <h1 className="text-2xl font-bold">Company Management</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/super-admin" className="text-sm text-slate-400 hover:text-white">← Overview</Link>
          <Link href="/admin/invites" className="text-xs font-bold bg-yellow-500 text-slate-900 px-3 py-1.5 rounded-lg hover:bg-yellow-400">
            + New Invite
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Companies",   value: orgs.length },
            { label: "Active Subscriptions", value: subs.filter(s => s.status === "active").length },
            { label: "Total Staff",        value: staff.length },
            { label: "Total Residents",    value: residents.length },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-3xl font-bold text-slate-900">{s.value}</p>
              <p className="text-sm text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Company table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-slate-800">
            <h2 className="font-bold text-white">All Companies ({orgs.length})</h2>
          </div>

          {orgs.length === 0 ? (
            <p className="text-center text-slate-400 py-12">No companies yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-3 text-left font-semibold text-slate-600">Company</th>
                    <th className="p-3 text-left font-semibold text-slate-600">Care Setting</th>
                    <th className="p-3 text-left font-semibold text-slate-600">Subscription</th>
                    <th className="p-3 text-center font-semibold text-slate-600">Users</th>
                    <th className="p-3 text-center font-semibold text-slate-600">Staff</th>
                    <th className="p-3 text-center font-semibold text-slate-600">Residents</th>
                    <th className="p-3 text-left font-semibold text-slate-600">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((org, i) => {
                    const sub = subs.find(s => s.organization_id === org.id);
                    const orgUsers = profiles.filter(p => p.organization_id === org.id);
                    const orgStaff = staff.filter(s => s.facility_id === org.id);
                    const orgResidents = residents.filter(r => r.facility_id === org.id);
                    const activeResidents = orgResidents.filter(r => r.status === "Active" || r.status === "active");
                    const subStatus = sub?.status ?? "none";
                    const careSettings: string[] = org.care_settings ?? [];

                    return (
                      <tr key={org.id} className={`border-b ${i % 2 === 0 ? "" : "bg-slate-50/40"} hover:bg-blue-50/30 transition-colors`}>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {org.logo_url
                              ? <img src={org.logo_url} alt="" className="h-8 w-8 rounded-lg object-contain border border-slate-200 bg-white p-0.5 shrink-0" />
                              : <div className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0"
                                    style={{ backgroundColor: org.primary_color ?? "#1a3a52" }}>
                                  {org.name.slice(0, 2).toUpperCase()}
                                </div>
                            }
                            <div>
                              <p className="font-semibold text-slate-900">{org.name}</p>
                              {org.slug && <code className="text-xs text-slate-400 font-mono">/{org.slug}</code>}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {careSettings.length > 0
                              ? careSettings.map(s => (
                                  <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                                    {CARE_LABEL[s] ?? s}
                                  </span>
                                ))
                              : <span className="text-slate-400 text-xs">—</span>
                            }
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold w-fit ${STATUS_STYLE[subStatus] ?? STATUS_STYLE.none}`}>
                              {subStatus === "none" ? "No subscription" : subStatus.replace("_", " ")}
                            </span>
                            {sub?.plan_id && (
                              <span className="text-xs text-slate-400">{CARE_LABEL[sub.plan_id] ?? sub.plan_id}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-semibold text-slate-700">{orgUsers.length}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-semibold text-slate-700">{orgStaff.length}</span>
                        </td>
                        <td className="p-3 text-center">
                          <div>
                            <span className="font-semibold text-slate-700">{activeResidents.length}</span>
                            {orgResidents.length !== activeResidents.length && (
                              <span className="text-xs text-slate-400 ml-1">/{orgResidents.length}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-xs text-slate-400">
                          {new Date(org.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* No-subscription companies alert */}
        {(() => {
          const noSub = orgs.filter(o => !subs.find(s => s.organization_id === o.id && s.status === "active"));
          if (noSub.length === 0) return null;
          return (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h3 className="font-bold text-amber-900 mb-2">Companies without active subscription ({noSub.length})</h3>
              <div className="flex flex-wrap gap-2">
                {noSub.map(o => (
                  <span key={o.id} className="text-sm bg-white border border-amber-200 text-amber-800 px-3 py-1 rounded-full">{o.name}</span>
                ))}
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
