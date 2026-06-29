// Free OpenStreetMap geocoding — no API key, best-effort only.
// Nominatim's usage policy requires a descriptive User-Agent and reasonable
// request volume; our call volume (one lookup per resident add/edit) is fine.
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "CareComplianceApp/1.0 (compliance.cyber-node.com)" },
    });
    if (!res.ok) return null;

    const results = (await res.json()) as Array<{ lat: string; lon: string }>;
    const first = results[0];
    if (!first) return null;

    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
