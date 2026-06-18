import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Public — caregiver accesses via email link (no auth required)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data, error } = await admin()
    .from("shifts")
    .select(`
      id, shift_date, start_time, end_time, status, notes, facility_id,
      staff(first_name, last_name, email),
      residents(first_name, last_name, address),
      organizations!shifts_facility_id_fkey(name, slug, primary_color, logo_url)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: "Shift not found" }, { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const org    = data.organizations as unknown as { name: string; slug: string | null; primary_color: string | null; logo_url: string | null } | null;
  const clockInUrl = org?.slug
    ? `${appUrl}/portal/${org.slug}/shift/${data.id}`
    : null;

  return NextResponse.json({ ...data, clockInUrl });
}
