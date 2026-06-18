"use client";

import { useState } from "react";
import AdminSignaturePanel from "./AdminSignaturePanel";

export default function AdminSignatureSection({
  staffId,
  orgColor,
  initialAdminSigUrl,
  initialAdminSigAt,
}: {
  staffId: string;
  orgColor: string;
  initialAdminSigUrl: string | null;
  initialAdminSigAt: string | null;
}) {
  const [adminSigUrl, setAdminSigUrl] = useState(initialAdminSigUrl);
  const [adminSigAt,  setAdminSigAt]  = useState(initialAdminSigAt);

  if (adminSigUrl) {
    const signedDate = adminSigAt
      ? new Date(adminSigAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "";
    return (
      <div className="mt-3">
        <div className="border border-slate-200 rounded-xl bg-slate-50 p-3 inline-block min-w-64">
          <img src={adminSigUrl} alt="Admin Signature" className="max-h-14 object-contain" />
          <p className="text-xs text-slate-400 mt-1">Signed by admin on {signedDate}</p>
        </div>
        <p className="text-xs text-emerald-600 mt-2 font-semibold">✅ Signed copy emailed to caregiver.</p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <p className="text-sm text-slate-500 mb-3">Add your signature below to complete the letter. A signed copy will be emailed to the caregiver automatically.</p>
      <AdminSignaturePanel
        staffId={staffId}
        orgColor={orgColor}
        onSigned={(url, at) => { setAdminSigUrl(url); setAdminSigAt(at); }}
      />
    </div>
  );
}
