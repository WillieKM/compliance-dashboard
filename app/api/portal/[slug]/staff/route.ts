import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = admin();

  const { data: org } = await db.from("organizations").select("id").eq("slug", slug).maybeSingle();
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: staff } = await db
    .from("staff")
    .select("id, first_name, last_name, role")
    .eq("facility_id", org.id)
    .order("first_name");

  return NextResponse.json(staff ?? []);
}
