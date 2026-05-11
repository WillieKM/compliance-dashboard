import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const { code, usedBy } = await request.json();

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await db.from("invite_codes").update({
    used: true,
    used_by: usedBy,
    used_at: new Date().toISOString(),
  }).eq("code", code);

  return NextResponse.json({ ok: true });
}
