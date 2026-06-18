import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@supabase/supabase-js";
import { sendStaffOnboardingEmail } from "@/lib/email";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = admin();

  const { data: staff } = await db
    .from("staff")
    .select("id, facility_id, first_name, last_name, email, status, onboarding_token, signing_token")
    .eq("id", id)
    .maybeSingle();

  if (!staff || staff.facility_id !== profile.facility_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Ensure both tokens exist
  const onboardingToken = staff.onboarding_token ?? crypto.randomUUID();
  const signingToken    = staff.signing_token    ?? crypto.randomUUID();

  const { error } = await db.from("staff").update({
    status:           "active",
    onboarding_token: onboardingToken,
    signing_token:    signingToken,
  }).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send onboarding email if staff has an email address
  if (staff.email) {
    const [orgRes] = await Promise.all([
      db.from("organizations")
        .select("name, primary_color, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email")
        .eq("id", profile.facility_id)
        .maybeSingle(),
    ]);
    const org    = orgRes.data;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    try {
      await sendStaffOnboardingEmail({
        to:          staff.email,
        staffName:   `${staff.first_name} ${staff.last_name}`,
        agencyName:  org?.name ?? "Your Agency",
        agencyColor: org?.primary_color ?? "#1a3a52",
        uploadUrl:   `${appUrl}/staff-onboarding/${onboardingToken}`,
        smtpConfig:  org ?? undefined,
      });
    } catch (e) {
      console.error("Onboarding email failed:", e);
    }
  }

  return NextResponse.json({ success: true, signingToken });
}
