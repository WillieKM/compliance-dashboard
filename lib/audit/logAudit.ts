import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface AuditEntry {
  facilityId: string;
  userId?:    string;
  userName?:  string;
  action:     string;
  entityType: string;
  entityId?:  string;
  entityName?: string;
  details?:   Record<string, unknown>;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await admin().from("audit_logs").insert({
      facility_id:  entry.facilityId,
      user_id:      entry.userId    ?? null,
      user_name:    entry.userName  ?? null,
      action:       entry.action,
      entity_type:  entry.entityType,
      entity_id:    entry.entityId  ?? null,
      entity_name:  entry.entityName ?? null,
      details:      entry.details   ?? null,
    });
  } catch {
    // Audit logging must never crash the calling request
  }
}
