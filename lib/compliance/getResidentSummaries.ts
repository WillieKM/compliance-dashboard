import { createClient } from "@/lib/supabase/server";
import type { ResidentRecord, ResidentStatus } from "@/lib/types/compliance";

export async function getResidentSummaries(facilityId: string): Promise<ResidentRecord[]> {
  const supabase = await createClient();

  const [residentsResult, docsResult] = await Promise.all([
    supabase
      .from("residents")
      .select("id, first_name, last_name, status, created_at")
      .eq("facility_id", facilityId)
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("id, resident_id, expiration_date")
      .eq("facility_id", facilityId)
      .eq("owner_type", "resident"),
  ]);

  if (residentsResult.error || !residentsResult.data) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const allDocs = docsResult.data ?? [];

  return residentsResult.data.map((resident) => {
    const residentDocs = allDocs.filter((d) => d.resident_id === resident.id);
    const pendingDocs = residentDocs.filter((d) => {
      if (!d.expiration_date) return false;
      const diff = Math.ceil(
        (new Date(d.expiration_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return diff >= 0 && diff <= 30;
    }).length;

    const raw = (resident.status ?? "").toLowerCase();
    const status: ResidentStatus =
      raw === "overdue" ? "overdue" : raw === "review" ? "review" : "compliant";

    return {
      id: resident.id,
      name: `${resident.first_name} ${resident.last_name}`,
      admittedDate: new Date(resident.created_at).toLocaleDateString(),
      status,
      totalDocs: residentDocs.length,
      pendingDocs,
    };
  });
}
