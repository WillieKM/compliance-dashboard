import Link from "next/link";
import { supabase } from "@/lib/supabase";

function getDocumentStatus(expirationDate: string | null) {
  if (!expirationDate) {
    return {
      label: "No Expiration",
      className: "bg-gray-100 text-gray-700",
    };
  }

  const today = new Date();
  const exp = new Date(expirationDate);

  const diffDays = Math.ceil(
    (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    return {
      label: "Expired",
      className: "bg-red-100 text-red-700",
    };
  }

  if (diffDays <= 30) {
    return {
      label: "Expiring Soon",
      className: "bg-yellow-100 text-yellow-700",
    };
  }

  return {
    label: "Valid",
    className: "bg-green-100 text-green-700",
  };
}

export default async function ResidentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: resident, error } = await supabase
    .from("residents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const { data: documents, error: documentsError } = await supabase
    .from("documents")
    .select("*")
    .eq("resident_id", id);

  if (error) {
    return (
      <div className="p-8">
        <Link href="/residents" className="text-blue-600 hover:underline">
          ← Back to Residents
        </Link>

        <div className="mt-6 rounded-lg bg-red-100 text-red-700 p-4">
          Resident query error: {error.message}
        </div>
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="p-8">
        <Link href="/residents" className="text-blue-600 hover:underline">
          ← Back to Residents
        </Link>

        <div className="mt-6 rounded-lg bg-yellow-100 text-yellow-700 p-4">
          No resident found for ID: {id}
        </div>
      </div>
    );
  }

  const expiredCount =
    documents?.filter(
      (doc) =>
        getDocumentStatus(doc.expiration_date).label === "Expired"
    ).length || 0;

  const expiringSoonCount =
    documents?.filter(
      (doc) =>
        getDocumentStatus(doc.expiration_date).label === "Expiring Soon"
    ).length || 0;

  const validCount =
    documents?.filter(
      (doc) =>
        getDocumentStatus(doc.expiration_date).label === "Valid"
    ).length || 0;

  return (
    <div>
      <div className="mb-6">
        <Link href="/residents" className="text-blue-600 hover:underline">
          ← Back to Residents
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h1 className="text-4xl font-bold">
          {resident.first_name} {resident.last_name}
        </h1>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-semibold">
              {resident.status || "N/A"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Valid Docs</p>
            <p className="font-semibold text-green-700">
              {validCount}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Expiring Soon
            </p>
            <p className="font-semibold text-yellow-700">
              {expiringSoonCount}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Expired Docs
            </p>
            <p className="font-semibold text-red-700">
              {expiredCount}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Room</p>
            <p className="font-semibold">
              {resident.room_number || "N/A"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Resident ID
            </p>
            <p className="font-semibold text-sm break-all">
              {resident.id}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            Documents
          </h2>

          <Link
            href={`/documents/new?owner_type=resident&resident_id=${resident.id}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Upload Resident Document
          </Link>
        </div>

        {documentsError && (
          <div className="mb-4 rounded-lg bg-red-100 text-red-700 p-3">
            {documentsError.message}
          </div>
        )}

        {documents && documents.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Document</th>
                <th className="text-left p-3">Expiration</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">File</th>
              </tr>
            </thead>

            <tbody>
              {documents.map((doc) => {
                const status = getDocumentStatus(
                  doc.expiration_date
                );

                return (
                  <tr key={doc.id} className="border-b">
                    <td className="p-3">
                      {doc.file_name || "Untitled"}
                    </td>

                    <td className="p-3">
                      {doc.expiration_date || "N/A"}
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>

                    <td className="p-3">
                      {doc.file_url ? (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          className="text-blue-600 hover:underline"
                        >
                          View
                        </a>
                      ) : (
                        "No file"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500">
            No documents found for this resident.
          </p>
        )}
      </div>
    </div>
  );
}