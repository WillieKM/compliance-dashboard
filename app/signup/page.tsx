import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default async function ResidentsPage() {
  const { data: residents, error } = await supabase
    .from("residents")
    .select("*")
    .order("created_at", { ascending: false });

  console.log({ residents, error });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Residents</h1>

        <a
          href="/residents/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Resident
        </a>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
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
                    <Link
                      href={`/residents/${resident.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {resident.first_name} {resident.last_name}
                    </Link>
                  </td>

                  <td className="p-3">{resident.status}</td>

                  <td className="p-3">{resident.room_number || "N/A"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="p-6 text-center text-gray-500">
                  No residents found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {error && (
          <p className="mt-4 text-sm text-red-600">
            {error.message}
          </p>
        )}
      </div>
    </div>
  );
}