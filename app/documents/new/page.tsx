import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { FACILITY_ID } from "@/lib/constants";
import { generateAlerts } from "@/lib/compliance/generateAlerts";

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{
    owner_type?: string;
    resident_id?: string;
    staff_id?: string;
  }>;
}) {
  const params = await searchParams;

  const ownerType = params.owner_type || "";
  const residentId = params.resident_id || "";
  const staffId = params.staff_id || "";

  const { data: documentTypes } = await supabase
    .from("document_types")
    .select("id, name, category")
    .order("name");

  async function uploadDocument(formData: FormData) {
    "use server";

    const file = formData.get("file") as File;
    const documentTypeId = formData.get("document_type_id") as string;
    const expirationDate = formData.get("expiration_date") as string;
    const ownerType = formData.get("owner_type") as string;
    const residentId = formData.get("resident_id") as string;
    const staffId = formData.get("staff_id") as string;

    if (!file || file.size === 0) {
      throw new Error("No file selected");
    }

    const filePath = `${FACILITY_ID}/${ownerType}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from("documents")
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase.from("documents").insert({
      facility_id: FACILITY_ID,
      owner_type: ownerType,
      resident_id: residentId || null,
      staff_id: staffId || null,
      document_type_id: documentTypeId,
      expiration_date: expirationDate || null,
      file_url: publicUrlData.publicUrl,
      file_name: file.name,
      status: "uploaded",
    });

    if (insertError) {
      throw new Error(`Insert failed: ${insertError.message}`);
    }
await generateAlerts();
    if (ownerType === "resident" && residentId) {
      redirect(`/residents/${residentId}`);
    }

    if (ownerType === "staff" && staffId) {
      redirect(`/staff/${staffId}`);
    }

    redirect("/documents");
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Upload Document</h1>

      <div className="bg-white rounded-xl shadow p-6">
        <form action={uploadDocument} className="space-y-6">
          <input type="hidden" name="owner_type" value={ownerType} />
          <input type="hidden" name="resident_id" value={residentId} />
          <input type="hidden" name="staff_id" value={staffId} />

          <div>
            <label className="block mb-2 font-medium">Document Type</label>

            <select
              name="document_type_id"
              required
              className="w-full border rounded-lg p-3"
            >
              <option value="">Select document type</option>

              {documentTypes?.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} — {type.category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 font-medium">Expiration Date</label>

            <input
              type="date"
              name="expiration_date"
              className="w-full border rounded-lg p-3"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">Upload File</label>

            <input
              type="file"
              name="file"
              required
              className="w-full border rounded-lg p-3"
            />
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Upload Document
          </button>
        </form>
      </div>
    </div>
  );
}