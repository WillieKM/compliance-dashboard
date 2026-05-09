import { supabase } from "@/lib/supabase";

export async function getCurrentProfile() {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .limit(1)
    .maybeSingle();

  console.log("TEMP PROFILE:", profile);
  console.log("TEMP PROFILE ERROR:", error);

  return profile;
}