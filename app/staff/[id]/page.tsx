import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getComplianceChecklist } from "@/lib/compliance/getComplianceChecklist";

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

export default async function StaffProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: staffMember, error } = await supabase
    .from("staff")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const { data: documents, error: documentsError } = await supabase
    .from("documents")
    .select("*")
    .eq("staff_id", id);

  const { data: requirements } = await supabase
    .from("compliance_requirements")
    .select(`
      *,
      document_types (
        id,
        name
      )
    
    `)
    .eq("applies_to", "staff");

  const checklist = await getComplianceChecklist("staff", id);

  if (error) {
    return (
      <div>
        <Link href="/staff" className="text-blue-600 hover:underline">
          ← Back to Staff
        </Link>

        <div className="mt-6 rounded-lg bg-red-100 text-red-700 p-4">
          Staff query error: {error.message}
        </div>
      </div>
    );
  }

  if (!staffMember) {
    return (
      <div>
        <Link href="/staff" className="text-blue-600 hover:underline">
          ← Back to Staff
        </Link>

        <div className="mt-6 rounded-lg bg-yellow-100 text-yellow-700 p-4">
          No staff member found for ID: {id}
        </div>
      </div>
    );
  }

  const missingRequirements =
    requirements?.filter((requirement) => {
      return !documents?.some(
        (doc) =>
          doc.document_type_id === requirement.required_document_type_id
      );
    }) || [];

  const complianceScore =
    requirements && requirements.length > 0
      ? Math.round(
          ((requirements.length - missingRequirements.length) /
            requirements.length) *
            100
        )
      : 100;
<div className="bg-white rounded-xl shadow p-6 mt-6">
  <h2 className="text-2xl font-bold mb-4">
    Compliance Checklist
  </h2>

  <table className="w-full">
    <thead>
      <tr className="border-b">
        <th className="text-left p-3">Requirement</th>
        <th className="text-left p-3">Status</th>
        <th className="text-left p-3">Expiration</th>
      </tr>
    </thead>

    <tbody>
      {checklist.map((item, index) => (
        <tr key={index} className="border-b">
          <td className="p-3">{item.requirement}</td>

          <td className="p-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                item.status === "valid"
                  ? "bg-green-100 text-green-700"
                  : item.status === "expiring"
                  ? "bg-yellow-100 text-yellow-700"
                  : item.status === "expired"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {item.status}
            </span>
          </td>

          <td className="p-3">
            {item.expiration_date || "N/A"}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
  const expiredCount =
    documents?.filter(
      (doc) => getDocumentStatus(doc.expiration_date).label === "Expired"
    ).length || 0;

  const expiringSoonCount =
    documents?.filter(
      (doc) => getDocumentStatus(doc.expiration_date).label === "Expiring Soon"
    ).length || 0;

  const validCount =
    documents?.filter(
      (doc) => getDocumentStatus(doc.expiration_date).label === "Valid"
    ).length || 0;

  return (
    <div>
      <div className="mb-6">
        <Link href="/staff" className="text-blue-600 hover:underline">
          ← Back to Staff
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h1 className="text-4xl font-bold">
          {staffMember.first_name} {staffMember.last_name}
        </h1>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <p className="text-sm text-gray-500">Role</p>
            <p className="font-semibold">{staffMember.role || "N/A"}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Compliance Score</p>
            <p className="font-semibold text-blue-700">{complianceScore}%</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Valid Docs</p>
            <p className="font-semibold text-green-700">{validCount}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Expiring Soon</p>
            <p className="font-semibold text-yellow-700">
              {expiringSoonCount}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Expired Docs</p>
            <p className="font-semibold text-red-700">{expiredCount}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-semibold">{staffMember.status || "active"}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-semibold break-all">
              {staffMember.email || "N/A"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="font-semibold">{staffMember.phone || "N/A"}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Documents</h2>

          <Link
            href={`/documents/new?owner_type=staff&staff_id=${staffMember.id}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Upload Staff Document
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
                const status = getDocumentStatus(doc.expiration_date);

                return (
                  <tr key={doc.id} className="border-b">
                    <td className="p-3">{doc.file_name || "Untitled"}</td>

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
            No documents found for this staff member.
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-6 mt-6">
        <h2 className="text-2xl font-bold mb-4">Missing Requirements</h2>

        {missingRequirements.length > 0 ? (
          <div className="space-y-3">
            {missingRequirements.map((requirement) => (
              <div
                key={requirement.id}
                className="rounded-lg border border-red-200 bg-red-50 p-4"
              >
                <p className="font-medium text-red-700">
                  Missing: {requirement.document_types?.name || "Unknown"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-green-700 font-medium">
            All required compliance documents uploaded.
          </p>
        )}
      </div>
    </div>
  );
}