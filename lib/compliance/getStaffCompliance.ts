import { createClient } from "@/lib/supabase/server";
import type { StaffComplianceRecord, StaffComplianceStatus } from "@/lib/types/compliance";

export async function getStaffCompliance(facilityId: string): Promise<StaffComplianceRecord[]> {
  const supabase = await createClient();

  const [staffResult, docsResult] = await Promise.all([
    supabase
      .from("staff")
      .select("id, first_name, last_name, role")
      .eq("facility_id", facilityId)
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("id, staff_id, expiration_date")
      .eq("facility_id", facilityId)
      .eq("owner_type", "staff"),
  ]);

  if (staffResult.error || !staffResult.data) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const allDocs = docsResult.data ?? [];

  return staffResult.data.map((staff) => {
    const staffDocs = allDocs.filter((d) => d.staff_id === staff.id);
    let expiring = 0;
    let expired = 0;

    for (const doc of staffDocs) {
      if (!doc.expiration_date) continue;
      const diff = Math.ceil(
        (new Date(doc.expiration_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diff < 0) expired++;
      else if (diff <= 30) expiring++;
    }

    const total = staffDocs.length;
    const completionPercentage =
      total > 0 ? Math.round(((total - expired) / total) * 100) : 100;

    let status: StaffComplianceStatus = "COMPLIANT";
    if (expired > 0) status = "OVERDUE";
    else if (expiring > 0) status = "REVIEW";

    return {
      id: staff.id,
      name: `${staff.first_name} ${staff.last_name}`,
      role: staff.role || "Caregiver",
      completionPercentage,
      expiringDocuments: expiring,
      expiredDocuments: expired,
      status,
    };
  });
}
