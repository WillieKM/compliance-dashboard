import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@supabase/supabase-js";
import { sendSignedLetterEmail, sendStaffOnboardingEmail } from "@/lib/email";
import { getSignedUrl } from "@/lib/storage";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = admin();

  const { data: staff } = await db
    .from("staff")
    .select("id, facility_id, first_name, last_name, email, tax_withholding, created_at, signed_at, signature_url, onboarding_token")
    .eq("id", id)
    .maybeSingle();

  if (!staff || staff.facility_id !== profile.facility_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { signatureDataUrl } = body;

  if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image/png;base64,")) {
    return NextResponse.json({ error: "Invalid signature data" }, { status: 400 });
  }

  // Upload admin signature to storage
  const base64   = signatureDataUrl.replace("data:image/png;base64,", "");
  const buffer   = Buffer.from(base64, "base64");
  const filePath = `${staff.facility_id}/signatures/admin-${staff.id}-${Date.now()}.png`;

  const { error: uploadErr } = await db.storage
    .from("documents")
    .upload(filePath, buffer, { contentType: "image/png", upsert: false });

  if (uploadErr) return NextResponse.json({ error: "Upload failed: " + uploadErr.message }, { status: 500 });

  const adminSignedAt = new Date().toISOString();

  const { error } = await db.from("staff").update({
    admin_signature_url: filePath,
    admin_signed_at:     adminSignedAt,
  }).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Email signed copy to caregiver if they have an email and already signed
  if (staff.email && staff.signed_at && staff.signature_url) {
    const { data: org } = await db
      .from("organizations")
      .select("name, primary_color, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email")
      .eq("id", staff.facility_id)
      .maybeSingle();

    const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const uploadUrl  = staff.onboarding_token ? `${appUrl}/staff-onboarding/${staff.onboarding_token}` : undefined;
    // Long-lived since this gets embedded in an email the caregiver may open much later.
    const oneYear = 60 * 60 * 24 * 365;

    try {
      await sendSignedLetterEmail({
        to:                 staff.email,
        staffName:          `${staff.first_name} ${staff.last_name}`,
        agencyName:         org?.name ?? "Your Agency",
        agencyColor:        org?.primary_color ?? "#1a3a52",
        taxWithholding:     staff.tax_withholding ?? "W2",
        hireDate:           staff.created_at,
        signatureUrl:       await getSignedUrl(staff.signature_url, oneYear) ?? "",
        signedAt:           staff.signed_at,
        adminSignatureUrl:  await getSignedUrl(filePath, oneYear) ?? undefined,
        adminSignedAt,
        smtpConfig:         org ?? undefined,
      });
    } catch (e) {
      console.error("Signed letter email failed:", e);
    }

    // Now that the supervisor has countersigned, send the document-upload email.
    if (uploadUrl) {
      try {
        await sendStaffOnboardingEmail({
          to:          staff.email,
          staffName:   `${staff.first_name} ${staff.last_name}`,
          agencyName:  org?.name ?? "Your Agency",
          agencyColor: org?.primary_color ?? "#1a3a52",
          uploadUrl,
          smtpConfig:  org ?? undefined,
        });
      } catch (e) {
        console.error("Onboarding email failed:", e);
      }
    }
  }

  const adminSignatureUrl = await getSignedUrl(filePath);
  return NextResponse.json({ success: true, adminSignatureUrl, adminSignedAt });
}
