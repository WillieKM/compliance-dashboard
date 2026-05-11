import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// POST — create a new invite code
export async function POST(request: Request) {
  const { createdFor, careSetting, notes, expiresInDays } = await request.json();

  let code = generateCode();
  // Ensure uniqueness
  const db = admin();
  for (let i = 0; i < 5; i++) {
    const { data } = await db.from("invite_codes").select("id").eq("code", code).maybeSingle();
    if (!data) break;
    code = generateCode();
  }

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
    : null;

  const { data, error } = await db.from("invite_codes").insert({
    code,
    created_for: createdFor || null,
    care_setting: careSetting || null,
    expires_at: expiresAt,
    notes: notes || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — revoke a code
export async function DELETE(request: Request) {
  const { id } = await request.json();
  await admin().from("invite_codes").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
