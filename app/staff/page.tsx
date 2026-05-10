import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: staff, error } = await supabase
    .from("staff")
    .select("*")
    .eq("facility_id", profile.facility_id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Staff</h1>
          <p className="mt-1 text-gray-500">Manage caregiver compliance, credentials, and onboarding status.</p>
        </div>
        <Link href="/staff/new" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
          + Add Staff
        </Link>
      </div>

      {error && <div className="rounded-lg bg-red-100 p-4 text-red-700">{error.message}</div>}

      <div className="overflow-hidden rounded-xl bg-white shadow">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="border-b">
              <th className="p-4 text-left text-sm font-semibold text-gray-600">Name</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-600">Role</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-600">Status</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-600">Email</th>
              <th className="p-4 text-right text-sm font-semibold text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {staff && staff.length > 0 ? (
              staff.map((person) => (
                <tr key={person.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{person.first_name} {person.last_name}</td>
                  <td className="p-4 text-gray-700">{person.role || "Caregiver"}</td>
                  <td className="p-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${person.status === "inactive" ? "bg-gray-100 text-gray-700" : person.status === "suspended" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {person.status || "active"}
                    </span>
                  </td>
                  <td className="p-4 text-gray-700">{person.email || "N/A"}</td>
                  <td className="p-4 text-right">
                    <Link href={`/staff/${person.id}`} className="font-medium text-blue-600 hover:underline">View Profile</Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-10 text-center text-gray-500">No staff found. Add your first caregiver to begin tracking compliance.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
