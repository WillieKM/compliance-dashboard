import { supabase } from "@/lib/supabase";
import { FACILITY_ID } from "@/lib/constants";

export async function generateAlerts() {
  const today = new Date();

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("facility_id", FACILITY_ID);

  if (!documents) return;

  for (const doc of documents) {
    if (!doc.expiration_date) continue;

    const expirationDate = new Date(doc.expiration_date);

    const diffDays = Math.ceil(
      (expirationDate.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    let alertType = "";
    let title = "";
    let message = "";

    if (diffDays < 0) {
      alertType = "expired_document";

      title = "Document Expired";

      message = `${doc.file_name || "Document"} expired on ${
        doc.expiration_date
      }`;
    } else if (diffDays <= 30) {
      alertType = "expiring_document";

      title = "Document Expiring Soon";

      message = `${doc.file_name || "Document"} expires on ${
        doc.expiration_date
      }`;
    }

    if (!alertType) continue;

    const { data: existingAlert } = await supabase
      .from("alerts")
      .select("id")
      .eq("document_id", doc.id)
      .eq("alert_type", alertType)
      .maybeSingle();

    if (existingAlert) continue;

    await supabase.from("alerts").insert({
      facility_id: FACILITY_ID,
      resident_id: doc.resident_id || null,
      document_id: doc.id,
      title,
      message,
      alert_type: alertType,
      due_date: doc.expiration_date,
    });
  }
}