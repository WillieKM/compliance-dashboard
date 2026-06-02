import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function WelcomeLetterPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const { id } = await params;

  const db = admin();
  const [staffRes, orgRes] = await Promise.all([
    db.from("staff").select("id, first_name, last_name, role, email, phone, tax_withholding, created_at").eq("id", id).maybeSingle(),
    db.from("organizations").select("name, logo_url, primary_color, tagline").eq("id", profile.facility_id).maybeSingle(),
  ]);

  const staff = staffRes.data;
  const org   = orgRes.data;

  if (!staff) redirect("/staff");

  const is1099      = staff.tax_withholding === "1099";
  const orgName     = org?.name ?? "Our Agency";
  const orgColor    = org?.primary_color ?? "#1a3a52";
  const letterDate  = new Date(staff.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div>
      {/* Back link + print button — hidden when printing */}
      <div className="print:hidden flex items-center justify-between mb-6">
        <Link href="/staff" className="text-blue-600 hover:underline text-sm">← Back to Staff</Link>
        <button
          onClick={undefined}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700"
          id="print-btn"
        >
          🖨 Print Welcome Letter
        </button>
      </div>

      {/* Letter — max width for readability, centered */}
      <div id="welcome-letter" className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg print:shadow-none print:rounded-none border border-slate-200 print:border-0 overflow-hidden">

        {/* Header / letterhead */}
        <div className="px-10 py-8 text-white" style={{ backgroundColor: orgColor }}>
          <div className="flex items-center gap-4">
            {org?.logo_url
              ? <img src={org.logo_url} alt={orgName} className="h-14 w-14 rounded-xl object-contain bg-white/10 p-1" />
              : <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center text-xl font-bold">{orgName.slice(0, 2).toUpperCase()}</div>
            }
            <div>
              <h1 className="text-2xl font-bold">{orgName}</h1>
              {org?.tagline && <p className="text-sm opacity-70">{org.tagline}</p>}
            </div>
          </div>
        </div>

        {/* Letter body */}
        <div className="px-10 py-8 space-y-6 text-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-bold text-slate-900">Welcome to {orgName}!</p>
            </div>
            <p className="text-sm text-slate-500">{letterDate}</p>
          </div>

          <p>Dear <strong>{staff.first_name} {staff.last_name}</strong>,</p>

          <p>
            We are pleased to welcome you to the <strong>{orgName}</strong> team
            {staff.role ? ` as a <strong>${staff.role}</strong>` : ""}.
            We are excited to have you join us and look forward to working with you to provide exceptional care to our clients.
          </p>

          <p>
            Please review the following information regarding your employment status and tax arrangement with our agency.
          </p>

          {/* Tax Election Section */}
          <div className={`rounded-xl border-2 p-5 ${is1099 ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
            <p className="font-bold text-sm uppercase tracking-wide mb-2 ${is1099 ? 'text-amber-800' : 'text-emerald-800'}">
              {is1099 ? "Tax Status: 1099 Independent Contractor" : "Tax Status: W-2 Employee"}
            </p>

            {is1099 ? (
              <div className="space-y-3 text-sm text-amber-900">
                <p>
                  You have elected to work as an <strong>Independent Contractor (1099)</strong>. Under this arrangement:
                </p>
                <ul className="list-disc list-inside space-y-1.5 ml-2">
                  <li>No federal, state, or local taxes will be withheld from your payments.</li>
                  <li>You are solely responsible for reporting and paying all income taxes, including self-employment tax (Social Security and Medicare).</li>
                  <li>You may be required to make estimated quarterly tax payments to the IRS and your state revenue department.</li>
                  <li>You will receive a Form 1099-NEC if total payments equal or exceed $600 in a calendar year.</li>
                </ul>
                <p className="font-semibold border-t border-amber-300 pt-3 mt-3">
                  By proceeding with employment, you acknowledge and accept full responsibility for your own tax obligations.
                  We strongly recommend consulting a licensed tax professional.
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-emerald-900">
                <p>
                  You have been enrolled as a <strong>W-2 Employee</strong>. Under this arrangement:
                </p>
                <ul className="list-disc list-inside space-y-1.5 ml-2">
                  <li>Federal, state, and local taxes will be withheld from each paycheck.</li>
                  <li>You will receive a Form W-2 at the end of each calendar year.</li>
                  <li>The agency will match your Social Security and Medicare (FICA) contributions.</li>
                </ul>
              </div>
            )}
          </div>

          {/* Staff details */}
          {(staff.email || staff.phone) && (
            <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1">
              <p className="font-semibold text-slate-700 mb-2">Your Information on File</p>
              {staff.email && <p>Email: <span className="font-mono">{staff.email}</span></p>}
              {staff.phone && <p>Phone: {staff.phone}</p>}
            </div>
          )}

          <p>
            If you have any questions about your employment arrangement, please contact your supervisor or the agency administrator.
            We are here to support you every step of the way.
          </p>

          <p>Welcome aboard, and thank you for choosing to serve our community!</p>

          <div className="pt-4 border-t border-slate-200">
            <p className="font-semibold">{orgName} Management</p>
            <p className="text-sm text-slate-500 mt-4">Employee Signature: ___________________________  Date: ___________</p>
            <p className="text-sm text-slate-500 mt-3">Supervisor Signature: ___________________________  Date: ___________</p>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        document.getElementById('print-btn').addEventListener('click', function(){ window.print(); });
      ` }} />

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white; }
          #welcome-letter { max-width: 100%; margin: 0; }
        }
      ` }} />
    </div>
  );
}
