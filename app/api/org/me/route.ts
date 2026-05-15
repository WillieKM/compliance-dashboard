import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await admin
    .from("profiles")
    .select("organization_id, facility_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) {
    return NextResponse.json({ error: "No organization" }, { status: 404 });
  }

  const { data: org } = await admin
    .from("organizations")
    .select("id, name, slug, primary_color, logo_url, tagline, care_settings, custom_domain")
    .eq("id", profile.organization_id)
    .maybeSingle();

  return NextResponse.json({
    org,
    facilityId: profile.facility_id,
    organizationId: profile.organization_id,
  });
}
