import { supabase } from "@/lib/supabase";
import { FACILITY_ID } from "@/lib/constants";

export async function getDashboardMetrics() {
  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("facility_id", FACILITY_ID);

  const { data: alerts } = await supabase
    .from("alerts")
    .select("*")
    .eq("facility_id", FACILITY_ID);

  const { data: residents } = await supabase
    .from("residents")
    .select("*")
    .eq("facility_id", FACILITY_ID);

  const { data: staff } = await supabase
    .from("staff")
    .select("*")
    .eq("facility_id", FACILITY_ID);

  const totalDocuments = documents?.length || 0;

  const expiredDocuments =
    documents?.filter((doc) => {
      if (!doc.expiration_date) return false;

      return new Date(doc.expiration_date) < new Date();
    }).length || 0;

  const expiringDocuments =
    documents?.filter((doc) => {
      if (!doc.expiration_date) return false;

      const today = new Date();
      const expiration = new Date(doc.expiration_date);

      const diffDays = Math.ceil(
        (expiration.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      return diffDays >= 0 && diffDays <= 30;
    }).length || 0;

  const missingRequirements =
    alerts?.filter(
      (alert) => alert.alert_type === "missing_requirement"
    ).length || 0;

  // Weighted compliance scoring system
  let complianceScore = 100;

  // Deduct for expired docs
  complianceScore -= expiredDocuments * 15;

  // Deduct for expiring soon docs
  complianceScore -= expiringDocuments * 5;

  // Deduct for missing requirements
  complianceScore -= missingRequirements * 10;

  // Prevent negative values
  if (complianceScore < 0) {
    complianceScore = 0;
  }

  const staffCompliance = {
    total: staff?.length || 0,
  };

  const residentCompliance = {
    total: residents?.length || 0,
  };

  return {
    complianceScore,
    expiredDocuments,
    expiringDocuments,
    missingRequirements,
    staffCompliance,
    residentCompliance,
    totalDocuments,
  };
}