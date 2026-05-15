import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function CustomDomainPage({
  searchParams,
}: {
  searchParams: Promise<{ host?: string; path?: string }>;
}) {
  const { host, path } = await searchParams;

  if (!host) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Domain not configured.</p>
      </div>
    );
  }

  const { data: org } = await admin()
    .from("organizations")
    .select("slug")
    .eq("custom_domain", decodeURIComponent(host))
    .maybeSingle();

  if (!org?.slug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow border border-slate-200 p-10">
          <p className="text-4xl mb-4">🔗</p>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Domain not connected</h2>
          <p className="text-slate-500 text-sm">
            This domain hasn&apos;t been connected to a CareCompliance account.
            Contact your agency administrator.
          </p>
        </div>
      </div>
    );
  }

  const portalPath = path && path !== "/" ? `/portal/${org.slug}${path}` : `/portal/${org.slug}`;
  redirect(portalPath);
}
