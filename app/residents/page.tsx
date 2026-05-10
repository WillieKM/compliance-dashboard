import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";

export const dynamic = "force-dynamic";

export default async function ResidentsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: residents, error } = await supabase
    .from("residents")
    .select("*")
    .eq("facility_id", profile.facility_id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Residents</h1>
        <Link href="/residents/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + Add Resident
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        {error && <div className="mb-4 rounded-lg bg-red-100 text-red-700 p-3">{error.message}</div>}
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Room</th>
            </tr>
          </thead>
          <tbody>
            {residents && residents.length > 0 ? (
              residents.map((resident) => (
                <tr key={resident.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <Link href={`/residents/${resident.id}`} className="text-blue-600 hover:underline font-medium">
                      {resident.first_name} {resident.last_name}
                    </Link>
                  </td>
                  <td className="p-3">{resident.status || "N/A"}</td>
                  <td className="p-3">{resident.room_number || "N/A"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="p-6 text-center text-gray-500">No residents found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
