import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { generateAlerts } from "@/lib/compliance/generateAlerts";

type SearchParams = Promise<{
  owner_type?: string;
  resident_id?: string;
  staff_id?: string;
  error?: string;
}>;

function getBackHref(ownerType: string, residentId: string, staffId: string) {
  if (ownerType === "resident" && residentId) return `/residents/${residentId}`;
  if (ownerType === "staff" && staffId) return `/staff/${staffId}`;
  return "/documents";
}

function getOwnerLabel(ownerType: string) {
  if (ownerType === "resident") return "Resident Document";
  if (ownerType === "staff") return "Staff Document";
  return "General Document";
}

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const params = await searchParams;

  const ownerType = params.owner_type || "general";
  const residentId = params.resident_id || "";
  const staffId = params.staff_id || "";
  const pageError = params.error || "";

  const backHref = getBackHref(ownerType, residentId, staffId);
  const ownerLabel = getOwnerLabel(ownerType);

  const appliesToFilter =
    ownerType === "staff"
      ? ["staff", "general"]
      : ownerType === "resident"
      ? ["resident", "general"]
      : ["resident", "staff", "general"];

  const { data: documentTypes, error: documentTypesError } = await supabase
    .from("document_types")
    .select("id, name, category, applies_to")
    .in("applies_to", appliesToFilter)
    .order("category")
    .order("name");

  // Group by category for <optgroup> rendering
  const grouped: Record<string, { id: string; name: string }[]> = {};
  for (const dt of documentTypes ?? []) {
    const cat = dt.category ?? "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ id: dt.id, name: dt.name });
  }

  async function uploadDocument(formData: FormData) {
    "use server";

    const p = await getCurrentProfile();
    if (!p) redirect("/login");
    const serverClient = await createClient();

    const file = formData.get("file") as File | null;
    const documentTypeId = String(formData.get("document_type_id") || "");
    const expirationDate = String(formData.get("expiration_date") || "");
    const ownerType = String(formData.get("owner_type") || "general");
    const residentId = String(formData.get("resident_id") || "");
    const staffId = String(formData.get("staff_id") || "");

    const errBase = `/documents/new?owner_type=${ownerType}&resident_id=${residentId}&staff_id=${staffId}`;

    if (!file || file.size === 0) redirect(`${errBase}&error=No+file+selected`);
    if (!documentTypeId) redirect(`${errBase}&error=Document+type+is+required`);

    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const filePath = `${p.facility_id}/${ownerType}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await serverClient.storage
      .from("documents")
      .upload(filePath, file, { upsert: false });

    if (uploadError) redirect(`${errBase}&error=${encodeURIComponent("Upload failed: " + uploadError.message)}`);

    const { error: insertError } = await serverClient.from("documents").insert({
      facility_id: p.facility_id,
      owner_type: ownerType,
      resident_id: ownerType === "resident" ? residentId : null,
      staff_id: ownerType === "staff" ? staffId : null,
      document_type_id: documentTypeId,
      expiration_date: expirationDate || null,
      file_url: filePath,
      file_name: file.name,
      status: "uploaded",
    });

    if (insertError) redirect(`${errBase}&error=${encodeURIComponent("Save failed: " + insertError.message)}`);

    try { await generateAlerts(p.facility_id); } catch {}

    if (ownerType === "resident" && residentId) redirect(`/residents/${residentId}`);
    if (ownerType === "staff" && staffId) redirect(`/staff/${staffId}`);
    redirect("/documents");
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div>
        <Link href={backHref} className="text-blue-600 hover:underline">
          ← Back
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload Document</h1>
        <p className="mt-1 text-gray-500">
          Upload a {ownerLabel.toLowerCase()} and attach an expiration date if
          required.
        </p>
      </div>

      {pageError && <div className="rounded-lg bg-red-100 border border-red-200 p-4 text-sm text-red-700">{pageError}</div>}
      {documentTypesError && (
        <div className="rounded-lg bg-red-100 p-4 text-red-700">
          Failed to load document types: {documentTypesError.message}
        </div>
      )}

      <div className="rounded-xl bg-white p-6 shadow">
        <div className="mb-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
          <p className="font-medium">Upload target</p>
          <p>Type: {ownerLabel}</p>
          {residentId && <p>Resident ID: {residentId}</p>}
          {staffId && <p>Staff ID: {staffId}</p>}
        </div>

        <form action={uploadDocument} className="space-y-6">
          <input type="hidden" name="owner_type" value={ownerType} />
          <input type="hidden" name="resident_id" value={residentId} />
          <input type="hidden" name="staff_id" value={staffId} />

          <div>
            <label className="mb-2 block font-medium text-gray-900">
              Document Type
            </label>

            <select
              name="document_type_id"
              required
              className="w-full rounded-lg border p-3"
              defaultValue=""
            >
              <option value="" disabled>
                Select document type
              </option>

              {Object.entries(grouped).map(([category, types]) => (
                <optgroup key={category} label={category}>
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block font-medium text-gray-900">
              Expiration Date
            </label>

            <input
              type="date"
              name="expiration_date"
              className="w-full rounded-lg border p-3"
            />

            <p className="mt-2 text-sm text-gray-500">
              Leave blank for documents that do not expire.
            </p>
          </div>

          <div>
            <label className="mb-2 block font-medium text-gray-900">
              Upload File
            </label>

            <input
              type="file"
              name="file"
              required
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
            >
              Upload Document
            </button>

            <Link
              href={backHref}
              className="rounded-lg border px-6 py-3 text-center font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}