import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeLetterEmail } from "@/lib/email";

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

  const [staffRes, orgRes] = await Promise.all([
    db.from("staff")
      .select("id, facility_id, first_name, last_name, email, tax_withholding, signing_token, onboarding_token")
      .eq("id", id)
      .maybeSingle(),
    db.from("organizations")
      .select("name, primary_color, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email")
      .eq("id", profile.facility_id)
      .maybeSingle(),
  ]);

  const staff = staffRes.data;
  const org   = orgRes.data;

  if (!staff || staff.facility_id !== profile.facility_id) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }
  if (!staff.email) {
    return NextResponse.json({ error: "This staff member has no email address on file." }, { status: 400 });
  }

  // Ensure signing token exists
  let signingToken = staff.signing_token;
  if (!signingToken) {
    signingToken = crypto.randomUUID();
    await db.from("staff").update({ signing_token: signingToken }).eq("id", id);
  }

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const signingUrl = `${appUrl}/sign/${signingToken}`;
  const uploadUrl  = staff.onboarding_token ? `${appUrl}/staff-onboarding/${staff.onboarding_token}` : null;

  try {
    await sendWelcomeLetterEmail({
      to:             staff.email,
      staffName:      `${staff.first_name} ${staff.last_name}`,
      agencyName:     org?.name ?? "Your Agency",
      agencyColor:    org?.primary_color ?? "#1a3a52",
      taxWithholding: staff.tax_withholding ?? "W2",
      signingUrl,
      uploadUrl,
      smtpConfig:     org ?? undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Email send failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ success: true, sentTo: staff.email });
}
