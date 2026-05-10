import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { formatDate, WA_COLORS } from "@/lib/compliance/waComplianceUtils";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  open:                "bg-red-100 text-red-800 border-red-200",
  under_investigation: "bg-amber-100 text-amber-800 border-amber-200",
  resolved:            "bg-blue-100 text-blue-800 border-blue-200",
  closed:              "bg-slate-100 text-slate-600 border-slate-200",
};

export default async function ComplaintsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const fid = profile.facility_id;

  const { data: complaints } = await supabase
    .from("complaints")
    .select("*")
    .eq("facility_id", fid)
    .order("complaint_date", { ascending: false });

  const all = complaints ?? [];
  const open       = all.filter((c) => c.status === "open").length;
  const active     = all.filter((c) => c.status === "under_investigation").length;
  const needsDoh   = all.filter((c) => c.doh_notification_required && !c.doh_reported_date).length;
  const followUp   = all.filter((c) => c.follow_up_needed && c.follow_up_date && c.follow_up_date <= new Date().toISOString().split("T")[0]).length;

  async function updateStatus(formData: FormData) {
    "use server";
    const id     = String(formData.get("id"));
    const status = String(formData.get("status"));
    const client = await createClient();
    await client.from("complaints").update({
      status,
      resolved_date: status === "resolved" ? new Date().toISOString().split("T")[0] : null,
    }).eq("id", id);
    revalidatePath("/compliance/complaints");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: WA_COLORS.navy }}>Complaints & Incidents</h1>
          <p className="text-slate-500 text-sm mt-0.5">WAC 246-335-045 · Log, investigate, resolve, and report</p>
        </div>
        <Link href="/compliance/complaints/new" className="px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90" style={{ backgroundColor: WA_COLORS.navy }}>
          + Log Complaint
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Open",           count: open,     cls: "bg-red-50 border-red-200 text-red-800" },
          { label: "Under Review",   count: active,   cls: "bg-amber-50 border-amber-200 text-amber-800" },
          { label: "DOH Report Due", count: needsDoh, cls: needsDoh > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800" },
          { label: "Follow-Up Due",  count: followUp, cls: followUp > 0 ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-slate-50 border-slate-200 text-slate-600" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-bold">{s.count}</p>
            <p className="text-xs font-semibold mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {needsDoh > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-900">🚨 {needsDoh} complaint{needsDoh > 1 ? "s" : ""} require DOH notification</p>
          <p className="text-sm text-red-700 mt-1">WAC 246-335-045 requires timely notification to the Department of Health for certain complaints.</p>
        </div>
      )}

      {all.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">📋</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No complaints logged yet</h3>
          <p className="text-slate-500 mb-4">Log client complaints to track investigation and resolution per WAC 246-335-045.</p>
          <Link href="/compliance/complaints/new" className="inline-block px-6 py-2.5 rounded-lg text-white font-bold text-sm" style={{ backgroundColor: WA_COLORS.navy }}>
            + Log First Complaint
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ backgroundColor: WA_COLORS.navy }}>
            <h2 className="font-bold text-white">Complaint Log</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {all.map((c) => (
              <div key={c.id} className="p-5 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <p className="font-bold text-slate-900">{c.client_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${STATUS_STYLE[c.status] ?? STATUS_STYLE.open}`}>
                        {c.status.replace("_", " ")}
                      </span>
                      {c.doh_notification_required && !c.doh_reported_date && (
                        <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-bold">DOH Report Due</span>
                      )}
                      {c.doh_notification_required && c.doh_reported_date && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">DOH Reported {formatDate(c.doh_reported_date)}</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-1">{c.complaint_description}</p>
                    <p className="text-xs text-slate-400">
                      Filed {formatDate(c.complaint_date)} by {c.filed_by} ({c.filed_by_relationship})
                      {c.resolved_date && ` · Resolved ${formatDate(c.resolved_date)}`}
                    </p>
                    {c.follow_up_needed && c.follow_up_date && (
                      <p className="text-xs text-amber-600 mt-1">Follow-up due: {formatDate(c.follow_up_date)}</p>
                    )}
                  </div>
                  <form action={updateStatus} className="flex items-center gap-2 flex-shrink-0">
                    <input type="hidden" name="id" value={c.id} />
                    <select name="status" defaultValue={c.status}
                      className="text-xs rounded-lg border border-slate-300 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="open">Open</option>
                      <option value="under_investigation">Under Investigation</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    <button type="submit" className="text-xs px-3 py-1.5 rounded-lg text-white font-semibold hover:opacity-90" style={{ backgroundColor: WA_COLORS.navy }}>
                      Update
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
