import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@supabase/supabase-js";
import { getSignedUrl } from "@/lib/storage";
import { geocodeAddress } from "@/lib/geocoding";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const dynamic = "force-dynamic";

const SKILLS = [
  { value: "personal_care",     label: "Personal Care" },
  { value: "skilled_nursing",   label: "Skilled Nursing" },
  { value: "therapy",           label: "Therapy" },
  { value: "companionship",     label: "Companionship" },
  { value: "medication_assist", label: "Medication Assist" },
  { value: "housekeeping",      label: "Housekeeping" },
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function EditStaffPage({
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

  const { data: staffMember } = await db
    .from("staff")
    .select("*")
    .eq("id", id)
    .eq("facility_id", profile.facility_id)
    .maybeSingle();

  if (!staffMember) redirect("/staff");
  const photoDisplayUrl = await getSignedUrl(staffMember.photo_url);

  const { data: availability } = await db
    .from("staff_availability")
    .select("day_of_week, start_time, end_time")
    .eq("staff_id", id)
    .eq("facility_id", profile.facility_id);
  const availabilityByDay = new Map((availability ?? []).map(a => [a.day_of_week, a]));

  async function updateStaff(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) redirect("/login");
    const db2 = admin();

    // Handle optional new photo
    const photoFile = formData.get("photo") as File | null;
    let photoUrl: string | null = staffMember!.photo_url ?? null;
    if (photoFile && photoFile.size > 0) {
      const safeName = photoFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const filePath = `${p.facility_id}/staff-photos/${Date.now()}-${safeName}`;
      const { error: uploadErr } = await db2.storage.from("documents").upload(filePath, photoFile, { upsert: false });
      if (!uploadErr) photoUrl = filePath;
    }
    const removePhoto = formData.get("remove_photo") === "1";
    if (removePhoto) photoUrl = null;

    const skills = formData.getAll("skills").map(String);

    const address   = String(formData.get("address") || "") || null;
    const manualLat = String(formData.get("lat") || "").trim();
    const manualLng = String(formData.get("lng") || "").trim();

    let lat        = staffMember!.lat ?? null;
    let lng        = staffMember!.lng ?? null;
    let geocodedAt = staffMember!.geocoded_at ?? null;

    if (manualLat && manualLng) {
      lat = parseFloat(manualLat);
      lng = parseFloat(manualLng);
      geocodedAt = null;
    } else if (address && (address !== staffMember!.address || !lat || !lng)) {
      const geo = await geocodeAddress(address);
      if (geo) { lat = geo.lat; lng = geo.lng; geocodedAt = new Date().toISOString(); }
    }

    const { error } = await db2.from("staff").update({
      first_name:      String(formData.get("first_name") || ""),
      last_name:       String(formData.get("last_name") || ""),
      role:            String(formData.get("role") || "") || null,
      email:           String(formData.get("email") || "") || null,
      phone:           String(formData.get("phone") || "") || null,
      status:          String(formData.get("status") || "active"),
      tax_withholding: String(formData.get("tax_withholding") || "W2"),
      photo_url:       photoUrl,
      skills,
      address,
      lat, lng,
      geocoded_at: geocodedAt,
    }).eq("id", id).eq("facility_id", p.facility_id);

    if (error) redirect(`/staff/${id}/edit?error=${encodeURIComponent(error.message)}`);

    // Replace availability rows wholesale — simplest correct way to handle
    // a fixed 7-day form where any day's times may have been cleared.
    await db2.from("staff_availability").delete().eq("staff_id", id).eq("facility_id", p.facility_id);
    const availabilityRows = DAYS
      .map((_, dayOfWeek) => ({
        day_of_week: dayOfWeek,
        start_time:  String(formData.get(`availability_start_${dayOfWeek}`) || "") || null,
        end_time:    String(formData.get(`availability_end_${dayOfWeek}`) || "") || null,
      }))
      .filter(r => r.start_time && r.end_time)
      .map(r => ({ ...r, facility_id: p.facility_id, staff_id: id }));
    if (availabilityRows.length > 0) {
      await db2.from("staff_availability").insert(availabilityRows);
    }

    redirect(`/staff/${id}`);
  }

  const inp = "w-full border rounded-lg p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

  return (
    <div className="max-w-2xl">
      <Link href={`/staff/${id}`} className="text-blue-600 hover:underline text-sm">← Back to Profile</Link>
      <h1 className="text-3xl font-bold my-6">Edit Staff Member</h1>

      {pageError && (
        <div className="mb-4 rounded-lg bg-red-100 border border-red-200 p-3 text-sm text-red-700">{pageError}</div>
      )}

      <form action={updateStaff} className="bg-white rounded-xl shadow p-6 space-y-5" encType="multipart/form-data">

        {/* Current photo */}
        <div>
          <label className="block mb-1.5 font-semibold text-slate-700">Photo</label>
          <div className="flex items-center gap-4 mb-3">
            {photoDisplayUrl ? (
              <img src={photoDisplayUrl} alt="" className="h-16 w-16 rounded-xl object-cover border border-slate-200" />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-xl font-bold text-slate-400">
                {staffMember.first_name?.[0]}{staffMember.last_name?.[0]}
              </div>
            )}
            <div className="flex-1">
              <input type="file" name="photo" accept="image/*"
                className="w-full text-sm text-slate-600 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              {staffMember.photo_url && (
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
            <input type="text" name="first_name" required defaultValue={staffMember.first_name} className={inp} />
          </div>
          <div>
            <label className="block mb-1.5 font-semibold text-slate-700">Last Name *</label>
            <input type="text" name="last_name" required defaultValue={staffMember.last_name} className={inp} />
          </div>
        </div>

        <div>
          <label className="block mb-1.5 font-semibold text-slate-700">Role / Position</label>
          <input type="text" name="role" defaultValue={staffMember.role ?? ""} placeholder="e.g. Caregiver, RN, Administrator" className={inp} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1.5 font-semibold text-slate-700">Email</label>
            <input type="email" name="email" defaultValue={staffMember.email ?? ""} className={inp} />
          </div>
          <div>
            <label className="block mb-1.5 font-semibold text-slate-700">Phone</label>
            <input type="text" name="phone" defaultValue={staffMember.phone ?? ""} className={inp} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1.5 font-semibold text-slate-700">Status</label>
            <select name="status" defaultValue={staffMember.status ?? "active"} className={inp}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div>
            <label className="block mb-1.5 font-semibold text-slate-700">Tax Withholding</label>
            <select name="tax_withholding" defaultValue={staffMember.tax_withholding ?? "W2"} className={inp}>
              <option value="W2">W-2 Employee</option>
              <option value="1099">1099 Independent Contractor</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block mb-1.5 font-semibold text-slate-700">Home Address</label>
          <input type="text" name="address" defaultValue={staffMember.address ?? ""} placeholder="e.g. 456 Oak St, Tacoma, WA 98402" className={inp} />
          <p className="mt-1 text-xs text-slate-400">Optional. Used to suggest the closest caregiver when scheduling a shift.</p>
        </div>

        <details className="rounded-lg border border-slate-200 p-3">
          <summary className="text-sm font-medium text-slate-600 cursor-pointer">Advanced: GPS coordinates override</summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block mb-1.5 text-sm text-slate-600">Latitude</label>
              <input type="text" name="lat" defaultValue={staffMember.lat ?? ""} placeholder="e.g. 47.2529" className={inp} />
            </div>
            <div>
              <label className="block mb-1.5 text-sm text-slate-600">Longitude</label>
              <input type="text" name="lng" defaultValue={staffMember.lng ?? ""} placeholder="e.g. -122.4443" className={inp} />
            </div>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Leave both blank to auto-locate from the address above when it changes.</p>
        </details>

        <div>
          <label className="block mb-1.5 font-semibold text-slate-700">Skills</label>
          <p className="text-xs text-slate-400 mb-2">Used to suggest the best-matched caregiver when scheduling a shift.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SKILLS.map(s => (
              <label key={s.value} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" name="skills" value={s.value} defaultChecked={(staffMember.skills ?? []).includes(s.value)} className="accent-blue-600" />
                {s.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block mb-1.5 font-semibold text-slate-700">Weekly Availability</label>
          <p className="text-xs text-slate-400 mb-2">Optional. Leave a day blank if there's no set window — unset days are treated as unconstrained, not unavailable.</p>
          <div className="space-y-2">
            {DAYS.map((day, i) => {
              const existing = availabilityByDay.get(i);
              return (
                <div key={day} className="grid grid-cols-3 gap-2 items-center">
                  <span className="text-sm text-slate-600">{day}</span>
                  <input type="time" name={`availability_start_${i}`} defaultValue={existing?.start_time ?? ""} className={inp} />
                  <input type="time" name={`availability_end_${i}`} defaultValue={existing?.end_time ?? ""} className={inp} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold">
            Save Changes
          </button>
          <Link href={`/staff/${id}`} className="px-6 py-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
