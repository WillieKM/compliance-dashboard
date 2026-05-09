import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { FACILITY_ID } from "@/lib/constants";

export default async function StaffPage() {
  const { data: staff, error } = await supabase
    .from("staff")
    .select("*")
    .eq("facility_id", FACILITY_ID)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Staff</h1>

        <Link
          href="/staff/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Staff
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-100 text-red-700 p-3">
            {error.message}
          </div>
        )}

        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Email</th>
            </tr>
          </thead>

          <tbody>
            {staff && staff.length > 0 ? (
              staff.map((person) => (
                <tr key={person.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <Link
                      href={`/staff/${person.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {person.first_name} {person.last_name}
                    </Link>
                  </td>

                  <td className="p-3">{person.role || "N/A"}</td>
                  <td className="p-3">{person.status || "active"}</td>
                  <td className="p-3">{person.email || "N/A"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500">
                  No staff found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}