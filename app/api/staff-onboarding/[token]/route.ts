import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Public — validate token and return staff info + required doc types
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = admin();

  const { data: staff } = await db
    .from("staff")
    .select("id, first_name, last_name, role, facility_id")
    .eq("onboarding_token", token)
    .maybeSingle();

  if (!staff) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });

  const [orgRes, docTypesRes, uploadedRes] = await Promise.all([
    db.from("organizations").select("name, primary_color, logo_url").eq("id", staff.facility_id).maybeSingle(),
    db.from("document_types").select("id, name, category").in("applies_to", ["staff", "general"]).order("category").order("name"),
    db.from("documents").select("id, document_type_id, file_name, created_at").eq("staff_id", staff.id).eq("owner_type", "staff"),
  ]);

  return NextResponse.json({
    staffId:     staff.id,
    staffName:   `${staff.first_name} ${staff.last_name}`,
    role:        staff.role,
    facilityId:  staff.facility_id,
    org:         orgRes.data,
    docTypes:    docTypesRes.data ?? [],
    uploaded:    uploadedRes.data ?? [],
  });
}
