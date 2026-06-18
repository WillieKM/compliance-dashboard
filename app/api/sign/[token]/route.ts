import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Public GET — return staff + org info for the signing page
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = admin();

  const { data: staff } = await db
    .from("staff")
    .select("id, first_name, last_name, role, email, tax_withholding, created_at, signed_at, signature_url, facility_id, onboarding_token")
    .eq("signing_token", token)
    .maybeSingle();

  if (!staff) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });

  const [orgRes, docTypesRes] = await Promise.all([
    db.from("organizations").select("name, logo_url, primary_color, tagline").eq("id", staff.facility_id).maybeSingle(),
    db.from("document_types").select("id, name, category").in("applies_to", ["staff", "general"]).order("category").order("name"),
  ]);
  const org      = orgRes.data;
  const docTypes = docTypesRes.data ?? [];
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return NextResponse.json({
    staffId:        staff.id,
    staffName:      `${staff.first_name} ${staff.last_name}`,
    role:           staff.role,
    taxWithholding: staff.tax_withholding,
    hireDate:       staff.created_at,
    alreadySigned:  !!staff.signed_at,
    signedAt:       staff.signed_at,
    signatureUrl:   staff.signature_url,
    uploadUrl:      staff.onboarding_token ? `${appUrl}/staff-onboarding/${staff.onboarding_token}` : null,
    docTypes,
    org: {
      name:         org?.name ?? "Your Agency",
      logoUrl:      org?.logo_url ?? null,
      primaryColor: org?.primary_color ?? "#1a3a52",
      tagline:      org?.tagline ?? null,
    },
  });
}

// Public POST — save signature image and mark as signed
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = admin();

  const { data: staff } = await db
    .from("staff")
    .select("id, facility_id, signed_at")
    .eq("signing_token", token)
    .maybeSingle();

  if (!staff) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  if (staff.signed_at) return NextResponse.json({ error: "Already signed" }, { status: 409 });

  const body = await request.json();
  const { signatureDataUrl } = body;

  if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image/png;base64,")) {
    return NextResponse.json({ error: "Invalid signature data" }, { status: 400 });
  }

  // Convert base64 to buffer and upload to storage
  const base64 = signatureDataUrl.replace("data:image/png;base64,", "");
  const buffer = Buffer.from(base64, "base64");
  const filePath = `${staff.facility_id}/signatures/${staff.id}-${Date.now()}.png`;

  const { error: uploadErr } = await db.storage
    .from("documents")
    .upload(filePath, buffer, { contentType: "image/png", upsert: false });

  if (uploadErr) return NextResponse.json({ error: "Signature upload failed: " + uploadErr.message }, { status: 500 });

  const { data: urlData } = db.storage.from("documents").getPublicUrl(filePath);
  const signatureUrl = urlData.publicUrl;

  const { error } = await db.from("staff").update({
    signed_at:     new Date().toISOString(),
    signature_url: signatureUrl,
  }).eq("id", staff.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, signatureUrl, signedAt: new Date().toISOString() });
}
