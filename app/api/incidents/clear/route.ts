import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit/logAudit";

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

  // Look up facility_id for the audit log
  const { data: report } = await admin()
    .from("visit_service_reports")
    .select("facility_id, visit_id")
    .eq("id", reportId)
    .single();

  if (report?.facility_id) {
    await logAudit({
      facilityId: report.facility_id,
      userId:     user.id,
      userName:   supervisorName,
      action:     "cleared",
      entityType: "incident",
      entityId:   reportId,
      entityName: `Incident/fall report cleared by ${supervisorName}`,
      details:    supervisorNotes ? { notes: supervisorNotes } : undefined,
    });
  }

  return NextResponse.json({ ok: true });
}
