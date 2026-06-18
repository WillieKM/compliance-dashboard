import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  getComplianceChecklist,
  summarizeChecklist,
} from "@/lib/compliance/getComplianceChecklist";
import DeleteStaffButton from "./DeleteStaffButton";
import ActivateStaffButton from "./ActivateStaffButton";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getDocumentStatus(expirationDate: string | null) {
  if (!expirationDate) return { label: "No Expiration", className: "bg-gray-100 text-gray-700" };
  const diffDays = Math.ceil((new Date(expirationDate).getTime() - Date.now()) / 86400000);
  if (diffDays < 0)   return { label: "Expired",        className: "bg-red-100 text-red-700" };
  if (diffDays <= 30) return { label: "Expiring Soon",  className: "bg-yellow-100 text-yellow-700" };
  return { label: "Valid", className: "bg-green-100 text-green-700" };
}

function getChecklistBadgeClass(status: string) {
  if (status === "valid")    return "bg-green-100 text-green-700";
  if (status === "expiring") return "bg-yellow-100 text-yellow-700";
  if (status === "expired")  return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
}

const STATUS_STYLE: Record<string, string> = {
  active:    "bg-green-100 text-green-700",
  inactive:  "bg-gray-100 text-gray-700",
  suspended: "bg-red-100 text-red-700",
  applicant: "bg-orange-100 text-orange-700",
};

export default async function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = admin();

  const [staffRes, docsRes, reqsRes] = await Promise.all([
    db.from("staff").select("*").eq("id", id).maybeSingle(),
    db.from("documents").select("*").eq("staff_id", id).order("created_at", { ascending: false }),
    db.from("compliance_requirements").select("*, document_types(id,name)").eq("applies_to", "staff"),
  ]);

  const staffMember = staffRes.data;
  const documents   = docsRes.data ?? [];
  const requirements = reqsRes.data ?? [];

  const checklist = await getComplianceChecklist("staff", id);
  const summary   = summarizeChecklist(checklist);

  if (staffRes.error || !staffMember) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Link href="/staff" className="text-blue-600 hover:underline">← Back to Staff</Link>
        <div className="mt-6 rounded-lg bg-red-100 p-4 text-red-700">
          {staffRes.error?.message ?? `No staff member found for ID: ${id}`}
        </div>
      </div>
    );
  }

  const missingRequirements = requirements.filter(
    (req) => !documents.some((doc) => doc.document_type_id === req.document_type_id)
  );

  const fullName = `${staffMember.first_name} ${staffMember.last_name}`;

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link href="/staff" className="text-blue-600 hover:underline text-sm">← Back to Staff</Link>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/staff/${id}/edit`}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50">
            ✏ Edit
          </Link>
          <DeleteStaffButton staffId={id} staffName={fullName} />
        </div>
      </div>

      {/* Profile card */}
      <div className="rounded-xl bg-white p-6 shadow">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-5">
            {/* Photo */}
            {staffMember.photo_url ? (
              <img
                src={staffMember.photo_url}
                alt={fullName}
                className="h-20 w-20 rounded-xl object-cover border-2 border-slate-200 shrink-0"
              />
            ) : (
              <div className="h-20 w-20 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-2xl font-bold text-slate-400 shrink-0">
                {staffMember.first_name?.[0]}{staffMember.last_name?.[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold text-gray-900">{fullName}</h1>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[staffMember.status] ?? "bg-gray-100 text-gray-700"}`}>
                  {staffMember.status || "active"}
                </span>
              </div>
              <p className="mt-1 text-gray-500">{staffMember.role || "Caregiver"}</p>
              {staffMember.status === "applicant" && staffMember.application_notes && (
                <div className="mt-2 rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm text-orange-800">
                  <p className="font-semibold mb-1">Application Details</p>
                  <p className="whitespace-pre-line">{staffMember.application_notes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            {staffMember.status === "applicant" && (
              <ActivateStaffButton staffId={id} />
            )}
            {staffMember.signed_at && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1.5 text-xs font-semibold">
                ✅ Letter Signed {new Date(staffMember.signed_at).toLocaleDateString()}
              </span>
            )}
            {!staffMember.signed_at && staffMember.status !== "applicant" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-700 px-3 py-1.5 text-xs font-semibold">
                ✍️ Signature Pending
              </span>
            )}
            <Link
              href={`/documents/new?owner_type=staff&staff_id=${staffMember.id}`}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 text-sm"
            >
              + Upload Document
            </Link>
            <Link
              href={`/staff/${id}/welcome-letter`}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 text-sm"
            >
              📄 Welcome Letter
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-6 gap-4">
          {[
            { label: "Compliance",    value: `${summary.score}%`,   color: "text-blue-700" },
            { label: "Valid Docs",    value: summary.valid,          color: "text-green-700" },
            { label: "Expiring Soon", value: summary.expiring,       color: "text-yellow-700" },
            { label: "Expired",       value: summary.expired,        color: "text-red-700" },
            { label: "Tax Status",    value: staffMember.tax_withholding || "W2", color: "text-gray-900" },
            { label: "Phone",         value: staffMember.phone || "N/A",           color: "text-gray-900" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border bg-gray-50 p-4 shadow-sm">
              <p className="text-sm text-gray-500">{label}</p>
              <p className={`font-semibold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 text-sm">
          <div><span className="text-gray-500">Email: </span><span className="font-medium break-all">{staffMember.email || "N/A"}</span></div>
          {staffMember.onboarding_token && (
            <div>
              <span className="text-gray-500">Onboarding Link: </span>
              <a href={`/staff-onboarding/${staffMember.onboarding_token}`} target="_blank" rel="noreferrer"
                className="text-blue-600 hover:underline font-mono text-xs">Open Upload Page</a>
            </div>
          )}
        </div>
      </div>

      {/* Compliance checklist */}
      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Compliance Checklist</h2>
        {checklist.length > 0 ? (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b">
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">Requirement</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">Expiration</th>
                </tr>
              </thead>
              <tbody>
                {checklist.map((item, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-3 text-gray-900">{item.requirement}</td>
                    <td className="p-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getChecklistBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-700">{item.expiration_date || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No compliance checklist items found.</p>
        )}
      </div>

      {/* Documents */}
      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Documents</h2>
        {docsRes.error && <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-700">{docsRes.error.message}</div>}
        {documents.length > 0 ? (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b">
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">Document</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">Expiration</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">File</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const s = getDocumentStatus(doc.expiration_date);
                  return (
                    <tr key={doc.id} className="border-b">
                      <td className="p-3 text-gray-900">{doc.file_name || "Untitled"}</td>
                      <td className="p-3 text-gray-700">{doc.expiration_date || "N/A"}</td>
                      <td className="p-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${s.className}`}>{s.label}</span>
                      </td>
                      <td className="p-3">
                        {doc.file_url
                          ? <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">View</a>
                          : <span className="text-gray-500">No file</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No documents found for this staff member.</p>
        )}
      </div>

      {/* Missing requirements */}
      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Missing Requirements</h2>
        {missingRequirements.length > 0 ? (
          <div className="space-y-3">
            {missingRequirements.map((req) => (
              <div key={req.id} className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="font-medium text-red-700">Missing: {req.document_types?.name || "Unknown"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-medium text-green-700">All required compliance documents uploaded.</p>
        )}
      </div>
    </div>
  );
}
