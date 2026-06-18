import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendDocumentsCompleteEmail } from "@/lib/email";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = admin();

  const { data: staff } = await db
    .from("staff")
    .select("id, first_name, last_name, facility_id")
    .eq("onboarding_token", token)
    .maybeSingle();

  if (!staff) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

  const [orgRes, docsRes] = await Promise.all([
    db.from("organizations")
      .select("name, primary_color, notification_email, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email")
      .eq("id", staff.facility_id)
      .maybeSingle(),
    db.from("documents")
      .select("file_name, document_types(name)")
      .eq("staff_id", staff.id)
      .eq("owner_type", "staff"),
  ]);

  const org      = orgRes.data;
  const docs     = docsRes.data ?? [];
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const notifyTo = org?.notification_email ?? process.env.NOTIFICATION_EMAIL;

  if (!notifyTo) {
    return NextResponse.json({ success: true, skipped: "No notification email configured" });
  }

  const uploadedDocs = docs.map(d => ({
    name: (d.document_types as unknown as { name: string } | null)?.name ?? d.file_name,
  }));

  try {
    await sendDocumentsCompleteEmail({
      to:           notifyTo,
      staffName:    `${staff.first_name} ${staff.last_name}`,
      agencyName:   org?.name ?? "Your Agency",
      agencyColor:  org?.primary_color ?? "#1a3a52",
      uploadedDocs,
      profileUrl:   `${appUrl}/staff/${staff.id}`,
      smtpConfig:   org ?? undefined,
    });
  } catch (e) {
    console.error("Documents-complete email failed:", e);
    return NextResponse.json({ error: "Email send failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
