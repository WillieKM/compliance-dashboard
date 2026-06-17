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
        <h1 className="text-4xl font-bold">Residents / Clients</h1>
        <Link href="/residents/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + Add Client
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
              <th className="text-left p-3">Address</th>
            </tr>
          </thead>
          <tbody>
            {residents && residents.length > 0 ? (
              residents.map((resident) => (
                <tr key={resident.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {resident.photo_url ? (
                        <img src={resident.photo_url} alt="" className="h-9 w-9 rounded-full object-cover border border-slate-200 shrink-0" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center text-sm font-bold text-blue-500 shrink-0">
                          {resident.first_name?.[0]}{resident.last_name?.[0]}
                        </div>
                      )}
                      <Link href={`/residents/${resident.id}`} className="text-blue-600 hover:underline font-medium">
                        {resident.first_name} {resident.last_name}
                      </Link>
                    </div>
                  </td>
                  <td className="p-3">{resident.status || "N/A"}</td>
                  <td className="p-3">{resident.room_number || "N/A"}</td>
                  <td className="p-3 text-sm text-slate-500 max-w-xs truncate">{resident.address || "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500">No clients found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
