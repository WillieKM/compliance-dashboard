import { supabase } from "@/lib/supabase";
import { FACILITY_ID } from "@/lib/constants";

export default async function DocumentsPage() {
  const { data: documents } = await supabase
    .from("documents")
    .select(`
      id,
      status,
      expiration_date,
      file_url,
      document_types (
        name,
        category
      )
    `)
    .eq("facility_id", FACILITY_ID);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Documents</h1>

        <a
          href="/documents/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          + Add Document
        </a>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Expiration</th>
              <th className="text-left p-3">File</th>
            </tr>
          </thead>

          <tbody>
            {documents?.map((doc: any) => (
              <tr key={doc.id} className="border-b">
                <td className="p-3">
                  {doc.document_types?.name || "Unknown"}
                </td>

                <td className="p-3">
                  {doc.document_types?.category || "Unknown"}
                </td>

                <td className="p-3">{doc.status}</td>

                <td className="p-3">
                  {doc.expiration_date || "No expiration"}
                </td>

                <td className="p-3">
                  {doc.file_url ? (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      className="text-blue-600 underline"
                    >
                      View File
                    </a>
                  ) : (
                    "No File"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}