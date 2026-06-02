import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Public — validate token, then upload document on behalf of staff member
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = admin();

  const { data: staff } = await db
    .from("staff")
    .select("id, facility_id")
    .eq("onboarding_token", token)
    .maybeSingle();

  if (!staff) return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });

  const formData = await request.formData();
  const file             = formData.get("file") as File | null;
  const documentTypeId   = formData.get("document_type_id") as string | null;
  const expirationDate   = formData.get("expiration_date") as string | null;

  if (!file || file.size === 0) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!documentTypeId)         return NextResponse.json({ error: "Document type required" }, { status: 400 });

  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const filePath     = `${staff.facility_id}/staff/${Date.now()}-${safeFileName}`;

  const { error: uploadError } = await db.storage
    .from("documents")
    .upload(filePath, file, { upsert: false });

  if (uploadError) return NextResponse.json({ error: "Upload failed: " + uploadError.message }, { status: 500 });

  const { data: urlData } = db.storage.from("documents").getPublicUrl(filePath);

  const { data: doc, error: insertError } = await db.from("documents").insert({
    facility_id:      staff.facility_id,
    owner_type:       "staff",
    staff_id:         staff.id,
    document_type_id: documentTypeId,
    expiration_date:  expirationDate || null,
    file_url:         urlData.publicUrl,
    file_name:        file.name,
    status:           "uploaded",
  }).select("id, file_name, document_type_id, created_at").single();

  if (insertError) return NextResponse.json({ error: "Save failed: " + insertError.message }, { status: 500 });
  return NextResponse.json(doc);
}
