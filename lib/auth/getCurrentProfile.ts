import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
  facility_id: string;
  organization_id: string;
  organizations: {
    id: string;
    name: string;
    care_settings: string[] | null;
  } | null;
};

export async function getCurrentProfile(): Promise<Profile | null> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, role, facility_id, organization_id, organizations(id, name, care_settings)")
      .eq("id", user.id)
      .maybeSingle();

    return profile as Profile | null;
  } catch {
    return null;
  }
}
