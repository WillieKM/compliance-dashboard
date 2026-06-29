import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Generates (or returns the existing) family-portal token for a resident.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = admin();

  const { data: resident } = await db
    .from("residents")
    .select("id, facility_id, family_portal_token")
    .eq("id", id)
    .maybeSingle();

  if (!resident || resident.facility_id !== profile.facility_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = resident.family_portal_token ?? crypto.randomUUID();
  if (!resident.family_portal_token) {
    const { error } = await db.from("residents").update({ family_portal_token: token }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ token });
}
