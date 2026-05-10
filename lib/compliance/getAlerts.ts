import { createClient } from "@/lib/supabase/server";
import type { ComplianceAlert, AlertPriority } from "@/lib/types/compliance";

function toPriority(alertType: string): AlertPriority {
  if (alertType === "expired_document") return "CRITICAL";
  if (alertType === "expiring_document") return "WARNING";
  return "INFO";
}

export async function getAlerts(facilityId: string): Promise<ComplianceAlert[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("facility_id", facilityId)
    .order("due_date", { ascending: true });

  if (error || !data) return [];

  return data.map((alert) => ({
    id: alert.id,
    priority: toPriority(alert.alert_type),
    title: alert.title ?? "Alert",
    message: alert.message ?? "",
    actionUrl: alert.resident_id ? `/residents/${alert.resident_id}` : "/alerts",
    timestamp: new Date(alert.due_date ?? alert.created_at),
    resolved: alert.resolved ?? false,
  }));
}
