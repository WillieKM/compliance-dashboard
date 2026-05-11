import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const { email, password, companyName, fullName, careSetting, inviteCode } = await request.json();

  // Validate inputs
  if (!email || !password || !companyName || !inviteCode) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Validate invite code
  const { data: codeRow } = await db
    .from("invite_codes")
    .select("id, used, expires_at")
    .eq("code", inviteCode.toUpperCase().trim())
    .maybeSingle();

  if (!codeRow)       return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
  if (codeRow.used)   return NextResponse.json({ error: "Invite code already used" }, { status: 400 });
  if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite code has expired" }, { status: 400 });
  }

  // Create the user via admin API
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,   // auto-confirm so no email needed
    user_metadata: { company_name: companyName, full_name: fullName || email },
  });

  if (authError) {
    return NextResponse.json({
      error: authError.message.includes("already")
        ? "This email is already registered."
        : authError.message,
    }, { status: 400 });
  }

  const userId = authData.user.id;

  // Create org + profile (the trigger might do this, but we do it explicitly for reliability)
  let orgId: string;
  const { data: org } = await db.from("organizations").insert({
    name: companyName,
    care_settings: [careSetting],
  }).select().single();

  if (org) {
    orgId = org.id;
  } else {
    // Trigger may have already created it — find it
    const { data: existingOrg } = await db
      .from("organizations")
      .select("id")
      .eq("name", companyName)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    orgId = existingOrg?.id;
  }

  if (orgId) {
    // Upsert profile
    await db.from("profiles").upsert({
      id: userId,
      full_name: fullName || email,
      role: "organization_admin",
      organization_id: orgId,
      facility_id: orgId,
    }, { onConflict: "id" });

    // Ensure care_settings is set
    await db.from("organizations").update({ care_settings: [careSetting] }).eq("id", orgId);
  }

  // Mark invite code as used
  await db.from("invite_codes").update({
    used: true,
    used_by: email,
    used_at: new Date().toISOString(),
  }).eq("id", codeRow.id);

  return NextResponse.json({ success: true });
}
