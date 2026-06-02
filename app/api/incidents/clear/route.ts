import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reportId, supervisorName, supervisorNotes } = await request.json();
  if (!reportId || !supervisorName) {
    return NextResponse.json({ error: "reportId and supervisorName are required" }, { status: 400 });
  }

  const { error } = await admin().from("visit_service_reports").update({
    cleared:          true,
    cleared_by:       supervisorName,
    cleared_at:       new Date().toISOString(),
    supervisor_notes: supervisorNotes || null,
  }).eq("id", reportId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
