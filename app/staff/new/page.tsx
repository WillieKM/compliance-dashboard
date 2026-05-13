import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewStaffPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  async function createStaff(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;
    const client = await createClient();
    const { error } = await client.from("staff").insert({
      facility_id: p.facility_id,
      first_name:  String(formData.get("first_name") || ""),
      last_name:   String(formData.get("last_name") || ""),
      role:        String(formData.get("role") || "") || null,
      email:       String(formData.get("email") || "") || null,
      phone:       String(formData.get("phone") || "") || null,
      status:      "active",
    });
    if (error) throw new Error(error.message);
    redirect("/staff");
  }

  const inp = "w-full border rounded-lg p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div>
      <Link href="/staff" className="text-blue-600 hover:underline text-sm">← Back to Staff</Link>
      <h1 className="text-4xl font-bold my-6">Add Staff Member</h1>
      <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
        <form action={createStaff} className="space-y-5">
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
          <div>
            <label className="block mb-1.5 font-medium text-slate-700">Role / Position</label>
            <input type="text" name="role" placeholder="e.g. Caregiver, RN, Administrator" className={inp} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 font-medium text-slate-700">Email</label>
              <input type="email" name="email" className={inp} />
            </div>
            <div>
              <label className="block mb-1.5 font-medium text-slate-700">Phone</label>
              <input type="text" name="phone" className={inp} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold">
              Add Staff Member
            </button>
            <Link href="/staff" className="px-6 py-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
