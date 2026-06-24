import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type ComplianceStatus = "valid" | "expiring" | "expired" | "missing";

export type ComplianceChecklistItem = {
  requirement_id: string;
  document_type_id: string | null;
  requirement: string;
  status: ComplianceStatus;
  expiration_date: string | null;
  document_id: string | null;
  file_name: string | null;
  file_url: string | null;
  days_until_expiration: number | null;
};

function getDaysUntilExpiration(expirationDate: string | null) {
  if (!expirationDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const exp = new Date(expirationDate);
  exp.setHours(0, 0, 0, 0);

  return Math.ceil(
    (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function getStatus(expirationDate: string | null): ComplianceStatus {
  if (!expirationDate) return "valid";

  const daysUntilExpiration = getDaysUntilExpiration(expirationDate);

  if (daysUntilExpiration === null) return "valid";
  if (daysUntilExpiration < 0) return "expired";
  if (daysUntilExpiration <= 30) return "expiring";

  return "valid";
}

export function calculateComplianceScore(checklist: ComplianceChecklistItem[]) {
  if (checklist.length === 0) return 100;

  const compliantItems = checklist.filter(
    (item) => item.status === "valid" || item.status === "expiring"
  ).length;

  return Math.round((compliantItems / checklist.length) * 100);
}

export function summarizeChecklist(checklist: ComplianceChecklistItem[]) {
  return {
    total: checklist.length,
    valid: checklist.filter((item) => item.status === "valid").length,
    expiring: checklist.filter((item) => item.status === "expiring").length,
    expired: checklist.filter((item) => item.status === "expired").length,
    missing: checklist.filter((item) => item.status === "missing").length,
    score: calculateComplianceScore(checklist),
  };
}

export async function getComplianceChecklist(
  appliesTo: "staff" | "resident",
  ownerId: string,
  careSettings: string[] = []
): Promise<ComplianceChecklistItem[]> {
 const { data: requirements, error: requirementsError } = await admin()
  .from("compliance_requirements")
  .select(
    `
    id,
    applies_to,
    document_type_id,
    facility_type,
    document_types!compliance_requirements_document_type_id_fkey (
      id,
      name
    )
  `
  )
  .eq("applies_to", appliesTo)
  .in("facility_type", careSettings);

  if (requirementsError) {
    throw new Error(
      `Failed to load compliance requirements: ${requirementsError.message}`
    );
  }

  // A document type that applies to multiple of the org's settings has one
  // row per setting (facility_type is single-valued) — dedupe so an org
  // running 2+ settings doesn't see the same requirement listed twice.
  const seenDocTypes = new Set<string>();
  const uniqueRequirements = (requirements ?? []).filter((r) => {
    if (!r.document_type_id) return true;
    if (seenDocTypes.has(r.document_type_id)) return false;
    seenDocTypes.add(r.document_type_id);
    return true;
  });

  let documentsQuery = admin()
    .from("documents")
    .select(
      `
      id,
      document_type_id,
      expiration_date,
      file_name,
      file_url,
      created_at
    `
    )
    .order("created_at", { ascending: false });

  if (appliesTo === "staff") {
    documentsQuery = documentsQuery.eq("staff_id", ownerId);
  }

  if (appliesTo === "resident") {
    documentsQuery = documentsQuery.eq("resident_id", ownerId);
  }

  const { data: documents, error: documentsError } = await documentsQuery;

  if (documentsError) {
    throw new Error(`Failed to load documents: ${documentsError.message}`);
  }

  const checklist =
    uniqueRequirements.map((requirement) => {
      const matchingDocuments =
        documents?.filter(
          (doc) =>
            doc.document_type_id === requirement.document_type_id
        ) || [];

      const bestDocument =
        matchingDocuments.find(
          (doc) => getStatus(doc.expiration_date) === "valid"
        ) ||
        matchingDocuments.find(
          (doc) => getStatus(doc.expiration_date) === "expiring"
        ) ||
        matchingDocuments[0];

      const dtRaw = requirement.document_types;
      const dtName: string =
        (Array.isArray(dtRaw) ? dtRaw[0]?.name : (dtRaw as { name?: string } | null)?.name) ?? "Unknown";

      if (!bestDocument) {
        return {
          requirement_id: requirement.id,
          document_type_id: requirement.document_type_id,
          requirement: dtName,
          status: "missing" as const,
          expiration_date: null,
          document_id: null,
          file_name: null,
          file_url: null,
          days_until_expiration: null,
        };
      }

      return {
        requirement_id: requirement.id,
        document_type_id: requirement.document_type_id,
        requirement: dtName,
        status: getStatus(bestDocument.expiration_date),
        expiration_date: bestDocument.expiration_date || null,
        document_id: bestDocument.id,
        file_name: bestDocument.file_name || null,
        file_url: bestDocument.file_url || null,
        days_until_expiration: getDaysUntilExpiration(
          bestDocument.expiration_date
        ),
      };
    });

  return checklist;
}