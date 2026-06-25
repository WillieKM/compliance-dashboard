import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type DocTypeCompletion = {
  id: string;
  name: string;
  complete: number;
  total: number;
  pct: number;
  overdue: number;
};

// Per-resident-document-type completion for a given facility + care setting,
// based on actual uploaded documents rather than placeholder numbers.
export async function getResidentDocumentCompletion(
  facilityId: string,
  settingId: string
): Promise<DocTypeCompletion[]> {
  const db = admin();

  const [docTypesRes, residentsRes, documentsRes] = await Promise.all([
    db.from("document_types")
      .select("id, name")
      .eq("applies_to", "resident")
      .contains("care_settings", [settingId]),
    db.from("residents").select("id").eq("facility_id", facilityId),
    db.from("documents")
      .select("document_type_id, expiration_date, resident_id")
      .eq("facility_id", facilityId)
      .eq("owner_type", "resident"),
  ]);

  const total = (residentsRes.data ?? []).length;
  const documents = documentsRes.data ?? [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (docTypesRes.data ?? []).map((dt) => {
    const matching = documents.filter((d) => d.document_type_id === dt.id);
    const validResidents = new Set(
      matching
        .filter((d) => !d.expiration_date || new Date(d.expiration_date) >= today)
        .map((d) => d.resident_id)
    );
    const overdueResidents = new Set(
      matching
        .filter((d) => d.expiration_date && new Date(d.expiration_date) < today)
        .map((d) => d.resident_id)
    );

    return {
      id: dt.id,
      name: dt.name,
      complete: validResidents.size,
      total,
      pct: total > 0 ? Math.round((validResidents.size / total) * 100) : 0,
      overdue: overdueResidents.size,
    };
  });
}
