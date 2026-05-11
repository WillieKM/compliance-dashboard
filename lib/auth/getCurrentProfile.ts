import { createClient } from "@/lib/supabase/server";

export type OrgBranding = {
  id: string;
  name: string;
  slug: string | null;
  primary_color: string | null;
  logo_url: string | null;
  tagline: string | null;
  care_settings: string[] | null;
};

export type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
  facility_id: string;
  organization_id: string;
  is_super_admin: boolean;
  organizations: OrgBranding | null;
};

export async function getCurrentProfile(): Promise<Profile | null> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, role, facility_id, organization_id, is_super_admin, organizations(id, name, slug, primary_color, logo_url, tagline, care_settings)")
      .eq("id", user.id)
      .maybeSingle();

    return profile as Profile | null;
  } catch {
    return null;
  }
}

export function getOrgColor(profile: Profile | null): string {
  return profile?.organizations?.primary_color ?? "#1a3a52";
}

export function getOrgSlug(profile: Profile | null): string {
  return profile?.organizations?.slug ?? "portal";
}
