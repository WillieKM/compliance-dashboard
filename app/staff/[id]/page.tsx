import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  getComplianceChecklist,
  summarizeChecklist,
} from "@/lib/compliance/getComplianceChecklist";

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

function getChecklistBadgeClass(status: string) {
  if (status === "valid") return "bg-green-100 text-green-700";
  if (status === "expiring") return "bg-yellow-100 text-yellow-700";
  if (status === "expired") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
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
    .eq("staff_id", id)
    .order("created_at", { ascending: false });

  const { data: requirements } = await supabase
    .from("compliance_requirements")
    .select(
      `
      *,
      document_types (
        id,
        name
      )
    `
    )
    .eq("applies_to", "staff");

 const checklist = await getComplianceChecklist("staff", id);
const summary = summarizeChecklist(checklist);

const complianceScore = summary.score;
const expiredCount = summary.expired;
const expiringSoonCount = summary.expiring;
const validCount = summary.valid;
  if (error) {
    return (
      <div>
        <Link href="/staff" className="text-blue-600 hover:underline">
          ← Back to Staff
        </Link>

        <div className="mt-6 rounded-lg bg-red-100 p-4 text-red-700">
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

        <div className="mt-6 rounded-lg bg-yellow-100 p-4 text-yellow-700">
          No staff member found for ID: {id}
        </div>
      </div>
    );
  }

  const missingRequirements =
    requirements?.filter((requirement) => {
      return !documents?.some(
        (doc) => doc.document_type_id === requirement.document_type_id
      );
    }) || [];


  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div>
        <Link href="/staff" className="text-blue-600 hover:underline">
          ← Back to Staff
        </Link>
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              {staffMember.first_name} {staffMember.last_name}
            </h1>
            <p className="mt-1 text-gray-500">
              Staff profile, credential tracking, and compliance readiness.
            </p>
          </div>

          <Link
            href={`/documents/new?owner_type=staff&staff_id=${staffMember.id}`}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            + Upload Staff Document
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
         <div className="rounded-xl border bg-gray-50 p-4 shadow-sm">
            <p className="text-sm text-gray-500">Role</p>
            <p className="font-semibold text-gray-900">
              {staffMember.role || "Caregiver"}
            </p>
          </div>

          <div className="rounded-xl border bg-gray-50 p-4 shadow-sm">
            <p className="text-sm text-gray-500">Compliance</p>
            <p className="font-semibold text-blue-700">{complianceScore}%</p>
          </div>

          <div className="rounded-xl border bg-gray-50 p-4 shadow-sm">
            <p className="text-sm text-gray-500">Valid Docs</p>
            <p className="font-semibold text-green-700">{validCount}</p>
          </div>

          <div className="rounded-xl border bg-gray-50 p-4 shadow-sm">
            <p className="text-sm text-gray-500">Expiring Soon</p>
            <p className="font-semibold text-yellow-700">
              {expiringSoonCount}
            </p>
          </div>

          <div className="rounded-xl border bg-gray-50 p-4 shadow-sm">
            <p className="text-sm text-gray-500">Expired Docs</p>
            <p className="font-semibold text-red-700">{expiredCount}</p>
          </div>

          <div className="rounded-xl border bg-gray-50 p-4 shadow-sm">
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-semibold text-gray-900">
              {staffMember.status || "active"}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-semibold break-all text-gray-900">
              {staffMember.email || "N/A"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="font-semibold text-gray-900">
              {staffMember.phone || "N/A"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">
          Compliance Checklist
        </h2>

        {checklist.length > 0 ? (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b">
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">
                    Requirement
                  </th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">
                    Expiration
                  </th>
                </tr>
              </thead>

              <tbody>
                {checklist.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-3 text-gray-900">{item.requirement}</td>

                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getChecklistBadgeClass(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="p-3 text-gray-700">
                      {item.expiration_date || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No compliance checklist items found.</p>
        )}
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
        </div>

        {documentsError && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-700">
            {documentsError.message}
          </div>
        )}

        {documents && documents.length > 0 ? (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b">
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">
                    Document
                  </th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">
                    Expiration
                  </th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">
                    File
                  </th>
                </tr>
              </thead>

              <tbody>
                {documents.map((doc) => {
                  const status = getDocumentStatus(doc.expiration_date);

                  return (
                    <tr key={doc.id} className="border-b">
                      <td className="p-3 text-gray-900">
                        {doc.file_name || "Untitled"}
                      </td>

                      <td className="p-3 text-gray-700">
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
                            rel="noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-gray-500">No file</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">
            No documents found for this staff member.
          </p>
        )}
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">
          Missing Requirements
        </h2>

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
          <p className="font-medium text-green-700">
            All required compliance documents uploaded.
          </p>
        )}
      </div>
    </div>
  );
}