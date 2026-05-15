import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function addDomainToVercel(domain: string): Promise<{ ok: boolean; error?: string; verified?: boolean }> {
  const token   = process.env.VERCEL_API_TOKEN;
  const project = process.env.VERCEL_PROJECT_ID;

  if (!token || !project) {
    return { ok: false, error: "Vercel API not configured" };
  }

  const res = await fetch(`https://api.vercel.com/v10/projects/${project}/domains`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: domain }),
  });

  const data = await res.json();

  if (!res.ok) {
    // Domain may already be added — check if it exists
    if (data.error?.code === "domain_already_in_use" || data.error?.code === "domain_already_exists") {
      return { ok: true, verified: true };
    }
    return { ok: false, error: data.error?.message ?? "Failed to add domain" };
  }

  return { ok: true, verified: data.verified ?? false };
}

async function checkDomainVerification(domain: string): Promise<{ verified: boolean; cname?: string }> {
  const token   = process.env.VERCEL_API_TOKEN;
  const project = process.env.VERCEL_PROJECT_ID;

  if (!token || !project) return { verified: false };

  const res = await fetch(
    `https://api.vercel.com/v10/projects/${project}/domains/${domain}`,
    { headers: { "Authorization": `Bearer ${token}` } }
  );

  if (!res.ok) return { verified: false };
  const data = await res.json();

  return {
    verified: data.verified ?? false,
    cname: data.apexName,
  };
}

// POST — add a custom domain
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { domain } = await request.json();
  if (!domain) return NextResponse.json({ error: "Domain required" }, { status: 400 });

  const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/$/, "");

  // Add to Vercel
  const vercelResult = await addDomainToVercel(cleanDomain);

  // Get org ID
  const { data: profile } = await admin()
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) {
    return NextResponse.json({ error: "No organization found" }, { status: 404 });
  }

  // Save to database
  await admin()
    .from("organizations")
    .update({
      custom_domain: cleanDomain,
      custom_domain_verified: vercelResult.verified ?? false,
    })
    .eq("id", profile.organization_id);

  if (!vercelResult.ok) {
    return NextResponse.json({
      success: false,
      domain: cleanDomain,
      error: vercelResult.error,
      message: "Domain saved but Vercel registration failed. Add it manually in Vercel dashboard.",
    });
  }

  return NextResponse.json({
    success: true,
    domain: cleanDomain,
    verified: vercelResult.verified,
    message: vercelResult.verified
      ? "Domain added and verified! It should be live shortly."
      : "Domain registered with Vercel. Add the DNS record below to complete setup.",
  });
}

// GET — check verification status
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");
  if (!domain) return NextResponse.json({ error: "Domain required" }, { status: 400 });

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { verified } = await checkDomainVerification(domain);

  if (verified) {
    // Update DB
    const { data: profile } = await admin()
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.organization_id) {
      await admin()
        .from("organizations")
        .update({ custom_domain_verified: true })
        .eq("id", profile.organization_id);
    }
  }

  return NextResponse.json({ verified, domain });
}
