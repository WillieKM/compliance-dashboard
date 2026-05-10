import { createClient } from "@/lib/supabase/server";

function getDaysUntilExpiration(expirationDate: string | null) {
  if (!expirationDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiration = new Date(expirationDate);
  expiration.setHours(0, 0, 0, 0);
  return Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export async function getDashboardMetrics(facilityId: string) {
  const supabase = await createClient();

  const [docsResult, alertsResult, residentsResult, staffResult] = await Promise.all([
    supabase.from("documents").select("*").eq("facility_id", facilityId),
    supabase.from("alerts").select("*").eq("facility_id", facilityId),
    supabase.from("residents").select("*").eq("facility_id", facilityId),
    supabase.from("staff").select("*").eq("facility_id", facilityId),
  ]);

  const documents = docsResult.data ?? [];
  const alerts = alertsResult.data ?? [];
  const staff = staffResult.data ?? [];

  const expiredDocs = documents.filter((d) => {
    const days = getDaysUntilExpiration(d.expiration_date);
    return days !== null && days < 0;
  }).length;

  const expiringSoon = documents.filter((d) => {
    const days = getDaysUntilExpiration(d.expiration_date);
    return days !== null && days >= 0 && days <= 30;
  }).length;

  const missingRequirements = alerts.filter((a) => a.alert_type === "missing_requirement").length;
  const activeAlerts = alerts.filter((a) => a.resolved !== true).length;

  let complianceAverage = 100;
  complianceAverage -= expiredDocs * 15;
  complianceAverage -= expiringSoon * 5;
  complianceAverage -= missingRequirements * 10;
  complianceAverage = Math.max(0, complianceAverage);

  const staffDocuments = documents.filter((d) => d.owner_type === "staff");
  const staffWithIssues = new Set<string>();
  staffDocuments.forEach((doc) => {
    if (!doc.staff_id) return;
    const days = getDaysUntilExpiration(doc.expiration_date);
    if (days !== null && days < 0) staffWithIssues.add(doc.staff_id);
  });

  const totalStaff = staff.length;
  const compliantStaff = Math.max(0, totalStaff - staffWithIssues.size);
  const inspectionReadiness =
    totalStaff > 0 ? Math.round((compliantStaff / totalStaff) * 100) : 100;

  return {
    totalDocuments: documents.length,
    totalStaff,
    totalResidents: residentsResult.data?.length ?? 0,
    compliantStaff,
    expiringSoon,
    expiredDocs,
    activeAlerts,
    missingRequirements,
    inspectionReadiness,
    complianceAverage,
  };
}
