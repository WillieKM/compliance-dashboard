import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const PUBLIC_URL_MARKER = "/object/public/documents/";

// Existing rows may hold a full public URL from before the bucket went
// private; new uploads store a bare path. Handle both transparently.
function toPath(value: string): string {
  const idx = value.indexOf(PUBLIC_URL_MARKER);
  return idx === -1 ? value : value.slice(idx + PUBLIC_URL_MARKER.length);
}

export async function getSignedUrl(
  value: string | null | undefined,
  expiresIn = 3600
): Promise<string | null> {
  if (!value) return null;
  const { data, error } = await admin().storage
    .from("documents")
    .createSignedUrl(toPath(value), expiresIn);
  return error || !data ? null : data.signedUrl;
}

// Bulk variant for lists — one round trip instead of N. Returns a map keyed
// by the original (pre-conversion) value so callers can look up by whatever
// they already have on hand (doc.file_url, staff.photo_url, etc.).
export async function getSignedUrls(
  values: (string | null | undefined)[],
  expiresIn = 3600
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const originals = values.filter((v): v is string => !!v);
  if (originals.length === 0) return result;

  const { data, error } = await admin().storage
    .from("documents")
    .createSignedUrls(originals.map(toPath), expiresIn);
  if (error || !data) return result;

  data.forEach((d, i) => {
    if (d.signedUrl) result.set(originals[i], d.signedUrl);
  });
  return result;
}
