import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient as adminClient } from "@supabase/supabase-js";
import PrintButton from "@/app/dashboard/_components/PrintButton";

export const dynamic = "force-dynamic";
const navy = "#1a3a52";

function admin() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const TYPE_LABEL: Record<string, string> = {
  fall: "Fall", injury: "Injury", medication_error: "Medication Error",
  behavioral: "Behavioral", elopement: "Elopement", other: "Other",
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function IncidentDetailPage({ params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { data: inc } = await admin()
    .from("home_care_incidents")
    .select("*")
    .eq("id", params.id)
    .eq("facility_id", profile.facility_id)
    .single();

  if (!inc) notFound();

  const isDoh      = inc.doh_report_required;
  const hasInjury  = inc.injury_sustained;
  const typeLabel  = TYPE_LABEL[inc.incident_type] ?? inc.incident_type;

  function Field({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-0.5">{label}</p>
        <p className="text-sm text-slate-900 whitespace-pre-wrap">{value}</p>
      </div>
    );
  }

  function Check({ label, value, danger = false }: { label: string; value: boolean; danger?: boolean }) {
    return (
      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border text-sm font-medium ${
        value
          ? danger ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"
          : "bg-slate-50 border-slate-200 text-slate-400"
      }`}>
        <span>{value ? (danger ? "⚠" : "✓") : "○"}</span>
        <span>{label}</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <style>{`@media print { .print\\:hidden { display: none !important; } }`}</style>

      {/* Header */}
      <div className="print:hidden flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link href="/dashboard/home-care/incidents" className="text-sm hover:underline" style={{ color: navy }}>
            ← Incident Log
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Incident Report</h1>
          <p className="text-slate-500 text-sm mt-0.5">WAC 246-335-065 · {fmtDate(inc.incident_date)}</p>
        </div>
        <div className="flex gap-2">
          <PrintButton label="Print Report" />
          <Link href={`/dashboard/home-care/incidents/${params.id}/edit`}
            className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 print:hidden">
            Edit
          </Link>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Incident Report — {typeLabel}</h1>
        <p className="text-sm text-slate-500">Home Care · WAC 246-335-065 · {fmtDate(inc.incident_date)}</p>
      </div>

      {/* DOH banner */}
      {isDoh && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 px-5 py-4">
          <p className="font-bold text-red-900 text-lg">🚨 DOH Report Required</p>
          <p className="text-sm text-red-700 mt-0.5">WAC 246-335-025 — This incident requires a Department of Health notification. Document the submission date and case number below.</p>
        </div>
      )}

      {/* Summary card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 text-white font-bold flex items-center justify-between" style={{ backgroundColor: navy }}>
          <span>Incident Summary</span>
          <div className="flex gap-2">
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{typeLabel}</span>
            {isDoh && <span className="text-xs bg-red-400 px-2 py-0.5 rounded-full">DOH Required</span>}
            {hasInjury && <span className="text-xs bg-orange-400 px-2 py-0.5 rounded-full">Injury</span>}
          </div>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <Field label="Client" value={inc.resident_name} />
          <Field label="Reported By" value={inc.reported_by} />
          <Field label="Date" value={fmtDate(inc.incident_date)} />
          <Field label="Time" value={inc.incident_time} />
          <Field label="Location" value={inc.location} />
          <Field label="Incident Type" value={typeLabel} />
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-slate-900">What Happened</h2>
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-sm text-slate-800 whitespace-pre-wrap">{inc.description || "No description entered."}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Check label="Witnessed by staff" value={!!inc.witnessed} />
          <Check label="Injury sustained" value={!!inc.injury_sustained} danger />
        </div>
        {inc.injury_description && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-500 mb-1">Injury Description</p>
            <p className="text-sm text-red-900">{inc.injury_description}</p>
          </div>
        )}
      </div>

      {/* Response */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-slate-900">Immediate Response</h2>
        {inc.immediate_action ? (
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{inc.immediate_action}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">No immediate action documented.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Check label="Physician notified" value={!!inc.physician_notified} />
          <Check label="Family notified" value={!!inc.family_notified} />
          <Check label="DOH report required" value={!!inc.doh_report_required} danger />
        </div>
      </div>

      {/* Analysis */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-slate-900">Analysis & Prevention</h2>
        {inc.contributing_factors ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Contributing Factors</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{inc.contributing_factors}</p>
            </div>
          </div>
        ) : null}
        {inc.prevention_plan ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Prevention Plan</p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{inc.prevention_plan}</p>
            </div>
          </div>
        ) : null}
        {!inc.contributing_factors && !inc.prevention_plan && (
          <p className="text-sm text-slate-400 italic">No analysis documented yet.</p>
        )}
      </div>

      {/* Additional notes */}
      {inc.notes && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-bold text-slate-900 mb-3">Additional Notes</h2>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{inc.notes}</p>
        </div>
      )}

      {/* Metadata footer */}
      <div className="text-xs text-slate-400 border-t border-slate-200 pt-4">
        Logged {inc.created_at ? new Date(inc.created_at).toLocaleString() : "—"} · Incident ID: {params.id.slice(0, 8).toUpperCase()}
      </div>
    </div>
  );
}
