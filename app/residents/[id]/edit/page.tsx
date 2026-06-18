import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const dynamic = "force-dynamic";

export default async function EditResidentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { id } = await params;
  const { error: pageError } = await searchParams;
  const db = admin();

  const { data: resident } = await db
    .from("residents")
    .select("*")
    .eq("id", id)
    .eq("facility_id", profile.facility_id)
    .maybeSingle();

  if (!resident) redirect("/residents");

  async function updateResident(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) redirect("/login");
    const db2 = admin();

    const photoFile = formData.get("photo") as File | null;
    let photoUrl: string | null = resident!.photo_url ?? null;
    if (photoFile && photoFile.size > 0) {
      const safeName = photoFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const filePath = `${p.facility_id}/resident-photos/${Date.now()}-${safeName}`;
      const { error: uploadErr } = await db2.storage.from("documents").upload(filePath, photoFile, { upsert: false });
      if (!uploadErr) {
        const { data: urlData } = db2.storage.from("documents").getPublicUrl(filePath);
        photoUrl = urlData.publicUrl;
      }
    }
    if (formData.get("remove_photo") === "1") photoUrl = null;

    const { error } = await db2.from("residents").update({
      first_name:  String(formData.get("first_name") || ""),
      last_name:   String(formData.get("last_name") || ""),
      status:      String(formData.get("status") || "Active"),
      room_number: String(formData.get("room_number") || "") || null,
      address:     String(formData.get("address") || "") || null,
      photo_url:   photoUrl,
    }).eq("id", id).eq("facility_id", p.facility_id);

    if (error) redirect(`/residents/${id}/edit?error=${encodeURIComponent(error.message)}`);
    redirect(`/residents/${id}`);
  }

  const inp = "w-full border rounded-lg p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

  return (
    <div className="max-w-2xl">
      <Link href={`/residents/${id}`} className="text-blue-600 hover:underline text-sm">← Back to Profile</Link>
      <h1 className="text-3xl font-bold my-6">Edit Client</h1>

      {pageError && (
        <div className="mb-4 rounded-lg bg-red-100 border border-red-200 p-3 text-sm text-red-700">{pageError}</div>
      )}

      <form action={updateResident} className="bg-white rounded-xl shadow p-6 space-y-5" encType="multipart/form-data">

        {/* Photo */}
        <div>
          <label className="block mb-1.5 font-semibold text-slate-700">Photo</label>
          <div className="flex items-center gap-4 mb-3">
            {resident.photo_url ? (
              <img src={resident.photo_url} alt="" className="h-16 w-16 rounded-xl object-cover border border-slate-200" />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-blue-50 border-2 border-dashed border-blue-200 flex items-center justify-center text-xl font-bold text-blue-400">
                {resident.first_name?.[0]}{resident.last_name?.[0]}
              </div>
            )}
            <div className="flex-1">
              <input type="file" name="photo" accept="image/*"
                className="w-full text-sm text-slate-600 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              {resident.photo_url && (
                <label className="flex items-center gap-1.5 mt-2 text-sm text-red-600 cursor-pointer">
                  <input type="checkbox" name="remove_photo" value="1" className="accent-red-600" />
                  Remove current photo
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1.5 font-semibold text-slate-700">First Name *</label>
            <input type="text" name="first_name" required defaultValue={resident.first_name} className={inp} />
          </div>
          <div>
            <label className="block mb-1.5 font-semibold text-slate-700">Last Name *</label>
            <input type="text" name="last_name" required defaultValue={resident.last_name} className={inp} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1.5 font-semibold text-slate-700">Status</label>
            <select name="status" defaultValue={resident.status ?? "Active"} className={inp}>
              <option>Active</option>
              <option>Not Active</option>
              <option>On Leave</option>
              <option>Discharged</option>
            </select>
          </div>
          <div>
            <label className="block mb-1.5 font-semibold text-slate-700">Room Number</label>
            <input type="text" name="room_number" defaultValue={resident.room_number ?? ""} placeholder="e.g. 101" className={inp} />
          </div>
        </div>

        <div>
          <label className="block mb-1.5 font-semibold text-slate-700">Client Address</label>
          <input type="text" name="address" defaultValue={resident.address ?? ""} placeholder="e.g. 123 Main St, Seattle, WA 98101" className={inp} />
          <p className="mt-1 text-xs text-slate-400">Shown to caregivers on clock-in for GPS verification.</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold">
            Save Changes
          </button>
          <Link href={`/residents/${id}`} className="px-6 py-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
