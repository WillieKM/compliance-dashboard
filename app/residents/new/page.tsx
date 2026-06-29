import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@supabase/supabase-js";
import { geocodeAddress } from "@/lib/geocoding";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const dynamic = "force-dynamic";

export default async function NewResidentPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const { error: pageError } = await searchParams;

  async function saveResident(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) redirect("/login");
    const db = admin();

    // Handle optional photo upload
    const photoFile = formData.get("photo") as File | null;
    let photoUrl: string | null = null;
    if (photoFile && photoFile.size > 0) {
      const safeName = photoFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const filePath = `${p.facility_id}/resident-photos/${Date.now()}-${safeName}`;
      const { error: uploadErr } = await db.storage.from("documents").upload(filePath, photoFile, { upsert: false });
      if (!uploadErr) photoUrl = filePath;
    }

    const address  = String(formData.get("address") || "") || null;
    const manualLat = String(formData.get("lat") || "").trim();
    const manualLng = String(formData.get("lng") || "").trim();

    let lat: number | null = null;
    let lng: number | null = null;
    let geocodedAt: string | null = null;

    if (manualLat && manualLng) {
      lat = parseFloat(manualLat);
      lng = parseFloat(manualLng);
    } else if (address) {
      const geo = await geocodeAddress(address);
      if (geo) { lat = geo.lat; lng = geo.lng; geocodedAt = new Date().toISOString(); }
    }

    const { error } = await db.from("residents").insert({
      facility_id:  p.facility_id,
      first_name:   String(formData.get("first_name") || ""),
      last_name:    String(formData.get("last_name") || ""),
      status:       String(formData.get("status") || "Active"),
      room_number:  String(formData.get("room_number") || "") || null,
      address,
      lat, lng,
      geocoded_at:  geocodedAt,
      photo_url:    photoUrl,
      family_contact_email: String(formData.get("family_contact_email") || "") || null,
    });
    if (error) redirect(`/residents/new?error=${encodeURIComponent(error.message)}`);
    redirect("/residents");
  }

  const inp = "w-full border rounded-lg p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="max-w-2xl">
      <Link href="/residents" className="text-blue-600 hover:underline text-sm">← Back to Residents</Link>
      <h1 className="text-4xl font-bold my-6">Add Resident / Client</h1>

      {pageError && <div className="mb-4 rounded-lg bg-red-100 border border-red-200 p-3 text-sm text-red-700">{pageError}</div>}
      <form action={saveResident} className="bg-white p-6 rounded-xl shadow space-y-5" encType="multipart/form-data">

        {/* Photo upload */}
        <div>
          <label className="block mb-1.5 font-medium text-slate-700">Client Photo (optional)</label>
          <input type="file" name="photo" accept="image/*" className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          <p className="mt-1 text-xs text-slate-400">Helps caregivers identify the client on clock-in. Recommended: clear face photo.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1.5 font-medium text-slate-700">First Name *</label>
            <input type="text" name="first_name" required className={inp} />
          </div>
          <div>
            <label className="block mb-1.5 font-medium text-slate-700">Last Name *</label>
            <input type="text" name="last_name" required className={inp} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1.5 font-medium text-slate-700">Status</label>
            <select name="status" className={inp}>
              <option>Active</option>
              <option>Not Active</option>
              <option>On Leave</option>
            </select>
          </div>
          <div>
            <label className="block mb-1.5 font-medium text-slate-700">Room Number</label>
            <input type="text" name="room_number" placeholder="e.g. 101" className={inp} />
          </div>
        </div>
        <div>
          <label className="block mb-1.5 font-medium text-slate-700">Client Address</label>
          <input type="text" name="address" placeholder="e.g. 123 Main St, Seattle, WA 98101" className={inp} />
          <p className="mt-1.5 text-xs text-slate-400">Auto-located for GPS clock-in verification. Override below if it's ever off.</p>
        </div>

        <div>
          <label className="block mb-1.5 font-medium text-slate-700">Family Contact Email</label>
          <input type="email" name="family_contact_email" placeholder="e.g. family@example.com" className={inp} />
          <p className="mt-1.5 text-xs text-slate-400">Used to notify family when the office sends them a message via the Family Portal.</p>
        </div>

        <details className="rounded-lg border border-slate-200 p-3">
          <summary className="text-sm font-medium text-slate-600 cursor-pointer">Advanced: GPS coordinates override</summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block mb-1.5 text-sm text-slate-600">Latitude</label>
              <input type="text" name="lat" placeholder="e.g. 47.6062" className={inp} />
            </div>
            <div>
              <label className="block mb-1.5 text-sm text-slate-600">Longitude</label>
              <input type="text" name="lng" placeholder="e.g. -122.3321" className={inp} />
            </div>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Leave blank to auto-locate from the address above.</p>
        </details>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700">
            Save Resident
          </button>
          <Link href="/residents" className="px-6 py-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
