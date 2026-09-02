import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const amber = "#b45309";

export default async function SuccessionPlanPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: planDoc } = await supabase
    .from("documents")
    .select("id, document_name, created_at, expiration_date, file_url")
    .eq("facility_id", profile.facility_id)
    .eq("document_type", "succession_plan")
    .maybeSingle();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/afh" className="text-sm hover:underline" style={{ color: amber }}>
          ← AFH Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Succession Plan</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          WAC 388-76 · DSHS now actively verifies this document exists at inspection
        </p>
      </div>

      {/* Status card */}
      {planDoc ? (
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div className="flex-1">
              <p className="font-bold text-emerald-900">Succession plan on file</p>
              <p className="text-sm text-emerald-800 mt-0.5">
                {planDoc.document_name}
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                Uploaded: {new Date(planDoc.created_at).toLocaleDateString()}
                {planDoc.expiration_date && (
                  <> · Expires: {new Date(planDoc.expiration_date).toLocaleDateString()}</>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {planDoc.file_url && (
              <Link href={`/documents/${planDoc.id}`} className="text-sm font-semibold text-emerald-700 underline">
                View document →
              </Link>
            )}
            <Link
              href="/documents/new"
              className="text-sm font-semibold underline"
              style={{ color: amber }}
            >
              Replace / Update →
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-red-900">No succession plan on file</p>
              <p className="text-sm text-red-800 mt-1">
                DSHS inspectors now actively verify that a written succession plan exists and is accessible during inspections. This is no longer informal — missing this document is a deficiency finding.
              </p>
              <div className="mt-3">
                <Link
                  href="/documents/new"
                  className="inline-block px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90"
                  style={{ backgroundColor: amber }}
                >
                  Upload Succession Plan →
                </Link>
                <p className="text-xs text-red-700 mt-2">
                  When uploading, set the document type to <code className="bg-red-100 px-1 rounded">succession_plan</code> so it appears here.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* What DSHS looks for */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="font-bold text-slate-900 mb-3">What DSHS looks for in a Succession Plan</h2>
        <ul className="space-y-3 text-sm text-slate-700">
          {[
            { icon: "👤", text: "Name and contact information of the successor operator (who will take over if you cannot continue)" },
            { icon: "📞", text: "Alternative contact person with full name and phone number" },
            { icon: "📅", text: "Transition timeline — how long the handoff will take and how operations will continue" },
            { icon: "🏠", text: "How current residents will be notified and protected during the transition" },
            { icon: "✍️", text: "Signed and dated by the current licensed operator" },
            { icon: "📂", text: "Physically accessible at the AFH during inspections (not just stored remotely)" },
          ].map((item) => (
            <li key={item.icon} className="flex items-start gap-3">
              <span className="text-lg shrink-0">{item.icon}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong className="text-amber-900">Inspection tip:</strong> Keep a printed copy in your AFH binder alongside your license and emergency plan. DSHS inspectors check for it during both scheduled and unannounced visits.
      </div>
    </div>
  );
}
