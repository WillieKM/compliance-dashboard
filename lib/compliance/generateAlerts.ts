import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function generateAlerts(facilityId?: string) {
  const db = admin();
  const today = new Date();

  const query = db.from("documents").select("*");
  if (facilityId) query.eq("facility_id", facilityId);

  const { data: documents } = await query;
  if (!documents) return;

  for (const doc of documents) {
    if (!doc.expiration_date) continue;

    const expirationDate = new Date(doc.expiration_date);
    const diffDays = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let alertType = "";
    let title = "";
    let message = "";

    if (diffDays < 0) {
      alertType = "expired_document";
      title = "Document Expired";
      message = `${doc.file_name || "Document"} expired on ${doc.expiration_date}`;
    } else if (diffDays <= 30) {
      alertType = "expiring_document";
      title = "Document Expiring Soon";
      message = `${doc.file_name || "Document"} expires on ${doc.expiration_date}`;
    }

    if (!alertType) continue;

    const { data: existingAlert } = await db
      .from("alerts")
      .select("id")
      .eq("document_id", doc.id)
      .eq("alert_type", alertType)
      .maybeSingle();

    if (existingAlert) continue;

    await db.from("alerts").insert({
      facility_id: doc.facility_id,
      resident_id: doc.resident_id || null,
      document_id: doc.id,
      title,
      message,
      alert_type: alertType,
      due_date: doc.expiration_date,
    });
  }
}
