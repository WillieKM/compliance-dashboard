import { supabase } from "@/lib/supabase";

function getStatus(expirationDate: string | null) {
  if (!expirationDate) {
    return "valid";
  }

  const today = new Date();
  const exp = new Date(expirationDate);

  const diffDays = Math.ceil(
    (exp.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    return "expired";
  }

  if (diffDays <= 30) {
    return "expiring";
  }

  return "valid";
}

export async function getComplianceChecklist(
  appliesTo: "staff" | "resident",
  ownerId: string
) {
  const { data: requirements } = await supabase
    .from("compliance_requirements")
    .select(`
      *,
      document_types (
        id,
        name
      )
    `)
    .eq("applies_to", appliesTo);

  let documentsQuery = supabase
    .from("documents")
    .select("*");

  if (appliesTo === "staff") {
    documentsQuery = documentsQuery.eq("staff_id", ownerId);
  }

  if (appliesTo === "resident") {
    documentsQuery = documentsQuery.eq("resident_id", ownerId);
  }

  const { data: documents } = await documentsQuery;

  const checklist =
    requirements?.map((requirement) => {
      const matchingDocument = documents?.find(
        (doc) =>
          doc.document_type_id ===
          requirement.required_document_type_id
      );

      if (!matchingDocument) {
        return {
          requirement:
            requirement.document_types?.name || "Unknown",
          status: "missing",
          expiration_date: null,
        };
      }

      return {
        requirement:
          requirement.document_types?.name || "Unknown",
        status: getStatus(matchingDocument.expiration_date),
        expiration_date:
          matchingDocument.expiration_date || null,
      };
    }) || [];

  return checklist;
}