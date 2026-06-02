import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as adminClient } from "@supabase/supabase-js";

function admin() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await admin().from("profiles").select("facility_id").eq("id", user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { data } = await admin()
    .from("residents")
    .select("id, first_name, last_name, address")
    .eq("facility_id", profile.facility_id)
    .eq("status", "Active")
    .order("first_name");

  return NextResponse.json(data ?? []);
}
