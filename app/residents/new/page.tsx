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

export default async function NewResidentPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  async function saveResident(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;
    const { error } = await admin().from("residents").insert({
      facility_id:  p.facility_id,
      first_name:   String(formData.get("first_name") || ""),
      last_name:    String(formData.get("last_name") || ""),
      status:       String(formData.get("status") || "Active"),
      room_number:  String(formData.get("room_number") || "") || null,
    });
    if (error) throw new Error(error.message);
    redirect("/residents");
  }

  const inp = "w-full border rounded-lg p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="max-w-2xl">
      <Link href="/residents" className="text-blue-600 hover:underline text-sm">← Back to Residents</Link>
      <h1 className="text-4xl font-bold my-6">Add Resident</h1>

      <form action={saveResident} className="bg-white p-6 rounded-xl shadow space-y-5">
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
