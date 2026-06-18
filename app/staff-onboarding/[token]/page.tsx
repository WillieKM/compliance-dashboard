"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

type DocType  = { id: string; name: string; category: string | null };
type Uploaded = { id: string; document_type_id: string; file_name: string; created_at: string };
type OrgInfo  = { name: string; primary_color: string | null; logo_url: string | null };

type PageData = {
  staffId:    string;
  staffName:  string;
  role:       string | null;
  facilityId: string;
  org:        OrgInfo | null;
  docTypes:   DocType[];
  uploaded:   Uploaded[];
};

export default function StaffOnboardingPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData]     = useState<PageData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [uploaded, setUploaded] = useState<Uploaded[]>([]);

  // Per-document upload state: { [docTypeId]: "idle"|"uploading"|"done"|"error" }
  const [states, setStates] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expDates, setExpDates] = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [notifyState, setNotifyState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const notifiedRef = useRef(false);

  useEffect(() => {
    fetch(`/api/staff-onboarding/${token}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setData(d); setUploaded(d.uploaded); } else setNotFound(true); })
      .catch(() => setNotFound(true));
  }, [token]);

  async function notifySupervisor() {
    setNotifyState("sending");
    const res = await fetch(`/api/staff-onboarding/${token}/complete`, { method: "POST" });
    setNotifyState(res.ok ? "sent" : "error");
  }

  async function handleUpload(docTypeId: string) {
    const input = fileRefs.current[docTypeId];
    const file  = input?.files?.[0];
    if (!file) return;

    setStates(s => ({ ...s, [docTypeId]: "uploading" }));
    setErrors(e => ({ ...e, [docTypeId]: "" }));

    const form = new FormData();
    form.append("file", file);
    form.append("document_type_id", docTypeId);
    const expDate = expDates[docTypeId];
    if (expDate) form.append("expiration_date", expDate);

    const res  = await fetch(`/api/staff-onboarding/${token}/upload`, { method: "POST", body: form });
    const json = await res.json();

    if (json.error) {
      setStates(s => ({ ...s, [docTypeId]: "error" }));
      setErrors(e => ({ ...e, [docTypeId]: json.error }));
    } else {
      setStates(s => ({ ...s, [docTypeId]: "done" }));
      setUploaded(prev => {
        const next = [...prev.filter(u => u.document_type_id !== docTypeId), json];
        // Auto-notify admin the first time all docs are uploaded
        if (data && next.length >= data.docTypes.length && !notifiedRef.current) {
          notifiedRef.current = true;
          fetch(`/api/staff-onboarding/${token}/complete`, { method: "POST" }).catch(() => {});
          setNotifyState("sent");
        }
        return next;
      });
      if (input) input.value = "";
    }
  }

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-sm">
        <p className="text-4xl mb-3">🔗</p>
        <p className="font-bold text-slate-800">Link not found</p>
        <p className="text-slate-500 text-sm mt-1">This upload link is invalid or has expired. Please contact your supervisor.</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const color      = data.org?.primary_color ?? "#1a3a52";
  const agencyName = data.org?.name ?? "Your Agency";
  const totalDocs  = data.docTypes.length;
  const doneCount  = uploaded.length;
  const pct        = totalDocs > 0 ? Math.round((doneCount / totalDocs) * 100) : 0;

  // Group by category
  const grouped: Record<string, DocType[]> = {};
  for (const dt of data.docTypes) {
    const cat = dt.category ?? "General";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(dt);
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: "#f8fafc" }}>
      {/* Header */}
      <div className="text-white px-5 py-5 flex items-center gap-3" style={{ backgroundColor: color }}>
        {data.org?.logo_url
          ? <img src={data.org.logo_url} alt="" className="h-10 w-10 rounded-xl object-contain bg-white/10 p-0.5" />
          : <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">{agencyName.slice(0, 2).toUpperCase()}</div>
        }
        <div>
          <p className="font-bold text-lg leading-tight">{agencyName}</p>
          <p className="text-sm opacity-70">Staff Document Upload</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* Welcome card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="font-bold text-slate-900 text-xl">Welcome, {data.staffName}! 👋</p>
          {data.role && <p className="text-slate-500 text-sm mt-0.5">{data.role}</p>}
          <p className="text-slate-600 text-sm mt-3">
            Please upload all required documents below. You can come back to this page at any time using this link — no login required.
          </p>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-slate-700 text-sm">Upload Progress</p>
            <p className="text-sm font-bold text-slate-900">{doneCount} / {totalDocs}</p>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
          </div>
          {pct === 100 && (
            <div className="mt-3 text-center">
              {notifyState === "sent" ? (
                <p className="text-emerald-700 text-sm font-semibold">✅ All documents uploaded! Your supervisor has been notified.</p>
              ) : (
                <button
                  onClick={notifySupervisor}
                  disabled={notifyState === "sending"}
                  className="w-full rounded-xl py-3 font-bold text-sm text-white disabled:opacity-60"
                  style={{ backgroundColor: color }}
                >
                  {notifyState === "sending" ? "Notifying…" : "✅ I'm Done — Notify My Supervisor"}
                </button>
              )}
              {notifyState === "error" && (
                <p className="text-red-600 text-xs mt-1">Notification failed — please contact your supervisor directly.</p>
              )}
            </div>
          )}
        </div>

        {/* Doc type groups */}
        {Object.entries(grouped).map(([category, types]) => (
          <div key={category} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b bg-slate-50">
              <p className="font-bold text-slate-700 text-sm uppercase tracking-wide">{category}</p>
            </div>
            <div className="divide-y divide-slate-100">
              {types.map(dt => {
                const doc       = uploaded.find(u => u.document_type_id === dt.id);
                const state     = states[dt.id] ?? (doc ? "done" : "idle");
                const errMsg    = errors[dt.id];
                const isDone    = state === "done" || !!doc;

                return (
                  <div key={dt.id} className={`p-4 ${isDone ? "bg-emerald-50/50" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-base ${isDone ? "text-emerald-600" : "text-slate-400"}`}>
                            {isDone ? "✅" : "📄"}
                          </span>
                          <p className={`font-semibold text-sm ${isDone ? "text-emerald-800" : "text-slate-800"}`}>
                            {dt.name}
                          </p>
                        </div>
                        {isDone && doc && (
                          <p className="text-xs text-emerald-600 mt-0.5 ml-6">
                            {doc.file_name} · {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        )}
                        {errMsg && <p className="text-xs text-red-600 mt-1 ml-6">{errMsg}</p>}
                      </div>

                      {!isDone && (
                        <button
                          onClick={() => fileRefs.current[dt.id]?.click()}
                          disabled={state === "uploading"}
                          className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          {state === "uploading" ? "Uploading…" : "Choose File"}
                        </button>
                      )}
                      {isDone && (
                        <button
                          onClick={() => { setStates(s => ({ ...s, [dt.id]: "idle" })); fileRefs.current[dt.id]?.click(); }}
                          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                        >
                          Replace
                        </button>
                      )}
                    </div>

                    {/* Hidden expiry date + file input */}
                    {!isDone && (
                      <div className="mt-2 ml-6">
                        <input
                          type="date"
                          value={expDates[dt.id] ?? ""}
                          onChange={e => setExpDates(d => ({ ...d, [dt.id]: e.target.value }))}
                          placeholder="Expiry date (if applicable)"
                          className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <p className="text-xs text-slate-400 mt-0.5">Expiry date (leave blank if none)</p>
                      </div>
                    )}

                    <input
                      ref={el => { fileRefs.current[dt.id] = el; }}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx"
                      className="hidden"
                      onChange={() => handleUpload(dt.id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {data.docTypes.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
            <p className="text-slate-500">No document requirements have been configured yet. Please contact your supervisor.</p>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 pb-4">
          Your documents are stored securely. This link is unique to you — please do not share it.
        </p>
      </div>
    </div>
  );
}
