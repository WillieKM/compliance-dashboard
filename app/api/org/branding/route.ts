import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const body = await request.json();
  const { name, slug, tagline, primaryColor, logoUrl, careSetting } = body;

  // Get the authenticated user's org
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) {
    return NextResponse.json({ error: "No organization found" }, { status: 404 });
  }

  // Use service role to bypass RLS on organizations update
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const cleanSlug = slug?.toLowerCase().replace(/[^a-z0-9-]/g, "-") ?? "";

  const { error } = await admin
    .from("organizations")
    .update({
      name: name || undefined,
      slug: cleanSlug || undefined,
      tagline: tagline || null,
      primary_color: primaryColor || "#1a3a52",
      logo_url: logoUrl || null,
      care_settings: careSetting ? [careSetting] : undefined,
    })
    .eq("id", profile.organization_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, slug: cleanSlug });
}
