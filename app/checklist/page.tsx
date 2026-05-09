import { supabase } from "@/lib/supabase";
import { FACILITY_ID } from "@/lib/constants";

export default async function ChecklistPage() {
  const { data: requirements } = await supabase
    .from("compliance_requirements")
    .select(`
      id,
      facility_type,
      required,
      document_types (
        id,
        name,
        category
      )
    `)
    .eq("facility_type", "afh");

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("facility_id", FACILITY_ID);

  const totalRequirements = requirements?.length || 0;

  const completedRequirements =
    requirements?.filter((req: any) =>
      documents?.find(
        (doc) => doc.document_type_id === req.document_types?.id
      )
    ).length || 0;

  const complianceScore =
    totalRequirements > 0
      ? Math.round((completedRequirements / totalRequirements) * 100)
      : 0;

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">
        Compliance Checklist
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow p-6 border">
          <p className="text-gray-500 text-sm">Compliance Score</p>
          <h2 className="text-5xl font-bold mt-2 text-blue-700">
            {complianceScore}%
          </h2>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 border">
          <p className="text-gray-500 text-sm">Completed</p>
          <h2 className="text-5xl font-bold mt-2 text-green-600">
            {completedRequirements}
          </h2>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 border">
          <p className="text-gray-500 text-sm">Missing</p>
          <h2 className="text-5xl font-bold mt-2 text-red-600">
            {totalRequirements - completedRequirements}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3">Document</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {requirements?.map((req: any) => {
              const exists = documents?.find(
                (doc) =>
                  doc.document_type_id === req.document_types?.id
              );

              return (
                <tr key={req.id} className="border-b">
                  <td className="p-3">
                    {req.document_types?.name || "Unknown"}
                  </td>

                  <td className="p-3">
                    {req.document_types?.category || "Unknown"}
                  </td>

                  <td className="p-3">
                    {exists ? (
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                        Complete
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                        Missing
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}