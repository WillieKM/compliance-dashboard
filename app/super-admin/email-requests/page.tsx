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

const STATUS_STYLE: Record<string, string> = {
  requested: "bg-amber-100 text-amber-800",
  active:    "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-100 text-slate-500",
};

export default async function EmailRequestsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.is_super_admin) redirect("/dashboard");

  const db = admin();
  const { data } = await db
    .from("organizations")
    .select("id, name, email_addon_status, email_addon_note")
    .not("email_addon_status", "is", null)
    .order("name");

  const orgs = data ?? [];
  const requested = orgs.filter(o => o.email_addon_status === "requested");
  const others = orgs.filter(o => o.email_addon_status !== "requested");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 text-white px-8 py-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">CareCompliance Platform</p>
          <h1 className="text-2xl font-bold">Branded Email Setup Requests</h1>
        </div>
        <Link href="/super-admin" className="text-sm text-slate-400 hover:text-white">← Overview</Link>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-slate-800">
            <h2 className="font-bold text-white">Pending ({requested.length})</h2>
          </div>
          {requested.length === 0 ? (
            <p className="text-center text-slate-400 py-10">No pending requests.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {requested.map(org => (
                <div key={org.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{org.name}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {org.email_addon_note || <span className="italic text-slate-400">No address preference given</span>}
                    </p>
                  </div>
                  <Link
                    href={`/settings/email?orgId=${org.id}&orgName=${encodeURIComponent(org.name)}`}
                    className="shrink-0 rounded-lg bg-blue-600 text-white text-sm font-semibold px-4 py-2 hover:bg-blue-700"
                  >
                    Configure →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {others.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b bg-slate-800">
              <h2 className="font-bold text-white">Other ({others.length})</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {others.map(org => (
                <div key={org.id} className="flex items-center justify-between gap-4 p-4">
                  <p className="font-bold text-slate-900">{org.name}</p>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLE[org.email_addon_status ?? ""] ?? ""}`}>
                      {org.email_addon_status}
                    </span>
                    <Link
                      href={`/settings/email?orgId=${org.id}&orgName=${encodeURIComponent(org.name)}`}
                      className="text-sm text-blue-600 hover:underline shrink-0"
                    >
                      Manage →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
