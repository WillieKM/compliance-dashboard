import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSignedUrl } from "@/lib/storage";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Public — validate token, then set/replace the staff member's own photo
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
  const file = formData.get("photo") as File | null;
  if (!file || file.size === 0) return NextResponse.json({ error: "No photo provided" }, { status: 400 });

  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const filePath = `${staff.facility_id}/staff-photos/${Date.now()}-${safeFileName}`;

  const { error: uploadError } = await db.storage
    .from("documents")
    .upload(filePath, file, { upsert: false });

  if (uploadError) return NextResponse.json({ error: "Upload failed: " + uploadError.message }, { status: 500 });

  const { error: updateError } = await db.from("staff").update({ photo_url: filePath }).eq("id", staff.id);
  if (updateError) return NextResponse.json({ error: "Save failed: " + updateError.message }, { status: 500 });

  const photoUrl = await getSignedUrl(filePath);
  return NextResponse.json({ success: true, photoUrl });
}
