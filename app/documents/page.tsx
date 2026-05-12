import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function statusBadge(status: string, expiry: string | null) {
  if (!expiry) return <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{status}</span>;
  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (days < 0)  return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Expired</span>;
  if (days <= 30) return <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Expiring Soon</span>;
  return <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Valid</span>;
}

export default async function DocumentsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: documents } = await supabase
    .from("documents")
    .select(`
      id, status, expiration_date, file_url, file_name, owner_type,
      document_types (name, category),
      residents (first_name, last_name),
      staff (first_name, last_name)
    `)
    .eq("facility_id", profile.facility_id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Documents</h1>
        <Link href="/documents/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
          + Add Document
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left p-3 font-semibold text-slate-600">Type</th>
              <th className="text-left p-3 font-semibold text-slate-600">Category</th>
              <th className="text-left p-3 font-semibold text-slate-600">Belongs To</th>
              <th className="text-left p-3 font-semibold text-slate-600">Status</th>
              <th className="text-left p-3 font-semibold text-slate-600">Expiration</th>
              <th className="text-left p-3 font-semibold text-slate-600">File</th>
            </tr>
          </thead>
          <tbody>
            {documents && documents.length > 0 ? documents.map((doc: any, i: number) => {
              const owner = doc.owner_type === "staff" && doc.staff
                ? `${doc.staff.first_name} ${doc.staff.last_name} (Staff)`
                : doc.owner_type === "resident" && doc.residents
                ? `${doc.residents.first_name} ${doc.residents.last_name} (Resident)`
                : doc.owner_type === "general" ? "General / Facility"
                : "—";

              return (
                <tr key={doc.id} className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                  <td className="p-3 font-medium text-slate-900">{doc.document_types?.name || doc.file_name || "Unknown"}</td>
                  <td className="p-3 text-slate-600">{doc.document_types?.category || "—"}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      doc.owner_type === "staff"    ? "bg-blue-100 text-blue-700" :
                      doc.owner_type === "resident" ? "bg-purple-100 text-purple-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {owner}
                    </span>
                  </td>
                  <td className="p-3">{statusBadge(doc.status, doc.expiration_date)}</td>
                  <td className="p-3 text-slate-600">{doc.expiration_date || "No expiry"}</td>
                  <td className="p-3">
                    {doc.file_url
                      ? <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">View File</a>
                      : <span className="text-slate-400">No file</span>}
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">No documents found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
