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
    db.from("staff")
      .select("id, first_name, last_name, role, email, phone, tax_withholding, onboarding_token, signing_token, signed_at, signature_url, created_at")
      .eq("id", id)
      .maybeSingle(),
    db.from("organizations")
      .select("name, logo_url, primary_color, tagline")
      .eq("id", profile.facility_id)
      .maybeSingle(),
  ]);

  const staff = staffRes.data;
  const org   = orgRes.data;

  if (!staff) redirect("/staff");

  // Ensure a signing token exists — generate one now if missing
  let signingToken = staff.signing_token;
  if (!signingToken) {
    signingToken = crypto.randomUUID();
    await db.from("staff").update({ signing_token: signingToken }).eq("id", id);
  }

  const is1099     = staff.tax_withholding === "1099";
  const orgName    = org?.name ?? "Our Agency";
  const orgColor   = org?.primary_color ?? "#1a3a52";
  const letterDate = new Date(staff.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const signingUrl = `${appUrl}/sign/${signingToken}`;
  const isSigned   = !!staff.signed_at;
  const signedDate = staff.signed_at
    ? new Date(staff.signed_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div>
      {/* Controls — hidden when printing */}
      <div className="print:hidden flex items-center justify-between mb-6 flex-wrap gap-3">
        <Link href={`/staff/${id}`} className="text-blue-600 hover:underline text-sm">← Back to Profile</Link>
        <div className="flex items-center gap-3 flex-wrap">
          {isSigned ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-4 py-2 text-sm font-semibold">
              ✅ Signed on {signedDate}
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Share this link for digital signature:</span>
              <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono max-w-xs truncate">{signingUrl}</code>
              <button
                id="copy-sign-btn"
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
              >
                Copy Link
              </button>
            </div>
          )}
          <button
            id="print-btn"
            className="bg-slate-800 text-white px-5 py-2 rounded-lg font-semibold hover:bg-slate-900 text-sm"
          >
            🖨 Print
          </button>
        </div>
      </div>

      {/* Unsigned reminder banner */}
      {!isSigned && (
        <div className="print:hidden mb-4 rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <span className="text-xl">✍️</span>
          <div>
            <p className="font-bold text-amber-900 text-sm">Awaiting Signature</p>
            <p className="text-amber-800 text-sm mt-0.5">
              Copy the signing link above and send it to <strong>{staff.first_name}</strong>.
              They can sign online from any device — no login required.
              The letter below will update automatically once signed.
            </p>
            <a href={signingUrl} target="_blank" rel="noreferrer"
              className="inline-block mt-2 text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-amber-700">
              Preview Signing Page →
            </a>
          </div>
        </div>
      )}

      {/* ─── THE LETTER ────────────────────────────────────────── */}
      <div id="welcome-letter" className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg print:shadow-none print:rounded-none border border-slate-200 print:border-0 overflow-hidden">

        {/* Letterhead */}
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

        {/* Body */}
        <div className="px-10 py-8 space-y-6 text-slate-800">
          <div className="flex items-start justify-between">
            <p className="text-lg font-bold text-slate-900">Welcome to {orgName}!</p>
            <p className="text-sm text-slate-500">{letterDate}</p>
          </div>

          <p>Dear <strong>{staff.first_name} {staff.last_name}</strong>,</p>

          <p>
            We are pleased to welcome you to the <strong>{orgName}</strong> team
            {staff.role ? ` as a ${staff.role}` : ""}.
            We are excited to have you join us and look forward to working with you to provide exceptional care to our clients.
          </p>

          <p>Please review the following information regarding your employment status and tax arrangement with our agency.</p>

          {/* Tax section */}
          <div className={`rounded-xl border-2 p-5 ${is1099 ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
            <p className={`font-bold text-sm uppercase tracking-wide mb-2 ${is1099 ? "text-amber-800" : "text-emerald-800"}`}>
              {is1099 ? "Tax Status: 1099 Independent Contractor" : "Tax Status: W-2 Employee"}
            </p>
            {is1099 ? (
              <div className="space-y-3 text-sm text-amber-900">
                <p>You have elected to work as an <strong>Independent Contractor (1099)</strong>. Under this arrangement:</p>
                <ul className="list-disc list-inside space-y-1.5 ml-2">
                  <li>No federal, state, or local taxes will be withheld from your payments.</li>
                  <li>You are solely responsible for reporting and paying all income taxes, including self-employment tax (Social Security and Medicare).</li>
                  <li>You may be required to make estimated quarterly tax payments to the IRS and your state revenue department.</li>
                  <li>You will receive a Form 1099-NEC if total payments equal or exceed $600 in a calendar year.</li>
                </ul>
                <p className="font-semibold border-t border-amber-300 pt-3 mt-3">
                  By proceeding with employment, you acknowledge and accept full responsibility for your own tax obligations. We strongly recommend consulting a licensed tax professional.
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-emerald-900">
                <p>You have been enrolled as a <strong>W-2 Employee</strong>. Under this arrangement:</p>
                <ul className="list-disc list-inside space-y-1.5 ml-2">
                  <li>Federal, state, and local taxes will be withheld from each paycheck.</li>
                  <li>You will receive a Form W-2 at the end of each calendar year.</li>
                  <li>The agency will match your Social Security and Medicare (FICA) contributions.</li>
                </ul>
              </div>
            )}
          </div>

          {/* Contact info */}
          {(staff.email || staff.phone) && (
            <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1">
              <p className="font-semibold text-slate-700 mb-2">Your Information on File</p>
              {staff.email && <p>Email: <span className="font-mono">{staff.email}</span></p>}
              {staff.phone && <p>Phone: {staff.phone}</p>}
            </div>
          )}

          {/* Signature area */}
          <div className="pt-4 border-t border-slate-200">
            {isSigned && staff.signature_url ? (
              <>
                <p className="text-sm text-slate-500 mb-1">Employee Signature:</p>
                <div className="border border-slate-200 rounded-xl bg-slate-50 p-3 inline-block min-w-64">
                  <img src={staff.signature_url} alt="Signature" className="max-h-16 object-contain" />
                  <p className="text-xs text-slate-400 mt-1">Signed electronically on {signedDate}</p>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-slate-500 mt-4">Supervisor Signature: ___________________________  Date: ___________</p>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-500 mt-2">Employee Signature: ___________________________  Date: ___________</p>
                <p className="text-sm text-slate-500 mt-3">Supervisor Signature: ___________________________  Date: ___________</p>
              </>
            )}
          </div>

          {/* Document upload — hidden from print */}
          {staff.onboarding_token && (() => {
            const uploadUrl = `${appUrl}/staff-onboarding/${staff.onboarding_token}`;
            return (
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-5 print:hidden">
                <p className="font-bold text-blue-900 mb-2">📎 Next Step: Upload Your Documents</p>
                <p className="text-sm text-blue-800 mb-3">
                  Before your first shift, please upload your required documents using the secure link below. No login required.
                </p>
                <a href={uploadUrl} target="_blank" rel="noreferrer"
                  className="inline-block rounded-lg bg-blue-600 text-white px-5 py-2.5 font-semibold text-sm hover:bg-blue-700">
                  Upload My Documents →
                </a>
                <p className="text-xs text-blue-600 mt-2">A copy of this link was also sent to {staff.email || "your email"}.</p>
              </div>
            );
          })()}

          <p>Welcome aboard, and thank you for choosing to serve our community!</p>

          <div className="pt-4 border-t border-slate-200">
            <p className="font-semibold">{orgName} Management</p>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        var pb = document.getElementById('print-btn');
        if (pb) pb.addEventListener('click', function(){ window.print(); });
        var cb = document.getElementById('copy-sign-btn');
        if (cb) cb.addEventListener('click', function(){
          navigator.clipboard.writeText(${JSON.stringify(signingUrl)}).then(function(){
            cb.textContent = 'Copied!';
            setTimeout(function(){ cb.textContent = 'Copy Link'; }, 2000);
          });
        });
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
