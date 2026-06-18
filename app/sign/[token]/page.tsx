"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";

type OrgInfo = { name: string; logoUrl: string | null; primaryColor: string; tagline: string | null };
type DocType  = { id: string; name: string; category: string | null };
type PageData = {
  staffId: string; staffName: string; role: string | null; taxWithholding: string | null;
  hireDate: string; alreadySigned: boolean; signedAt: string | null; signatureUrl: string | null;
  uploadUrl: string | null; docTypes: DocType[];
  org: OrgInfo;
};

export default function SignWelcomeLetterPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData]         = useState<PageData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]         = useState(false);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [sigUrl, setSigUrl]     = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const drawing    = useRef(false);
  const lastPos    = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    fetch(`/api/sign/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        setData(d);
        if (d.alreadySigned) { setDone(true); setSignedAt(d.signedAt); setSigUrl(d.signatureUrl); }
      })
      .catch(() => setNotFound(true));
  }, [token]);

  // Set canvas DPI-aware size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
  }, [data]);

  function getXY(e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const src  = "touches" in e ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  const onStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    drawing.current = true;
    const pos = getXY(e.nativeEvent, canvasRef.current!);
    lastPos.current = pos;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, []);

  const onMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    const pos = getXY(e.nativeEvent, canvasRef.current!);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasDrawn(true);
  }, []);

  const onEnd = useCallback(() => { drawing.current = false; }, []);

  function clearCanvas() {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext("2d")!;
    const dpr    = window.devicePixelRatio || 1;
    const rect   = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width * dpr, rect.height * dpr);
    setHasDrawn(false);
  }

  async function handleSign() {
    if (!hasDrawn) return;
    setSubmitting(true);
    setError(null);

    const canvas = canvasRef.current!;
    const dataUrl = canvas.toDataURL("image/png");

    const res  = await fetch(`/api/sign/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signatureDataUrl: dataUrl }),
    });
    const json = await res.json();

    if (json.error) {
      setError(json.error);
      setSubmitting(false);
    } else {
      setDone(true);
      setSignedAt(json.signedAt);
      setSigUrl(json.signatureUrl);
    }
  }

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl border p-10 text-center max-w-sm">
        <p className="text-4xl mb-3">🔗</p>
        <p className="font-bold text-slate-800">Link not found</p>
        <p className="text-slate-500 text-sm mt-1">This signing link is invalid or has expired. Contact your agency.</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const { org } = data;
  const is1099  = data.taxWithholding === "1099";
  const letterDate = new Date(data.hireDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <div className="text-white px-6 py-5 flex items-center gap-3" style={{ backgroundColor: org.primaryColor }}>
        {org.logoUrl
          ? <img src={org.logoUrl} alt={org.name} className="h-10 w-10 rounded-xl object-contain bg-white/10 p-0.5" />
          : <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">{org.name.slice(0,2).toUpperCase()}</div>
        }
        <div>
          <p className="font-bold text-lg leading-tight">{org.name}</p>
          <p className="text-xs opacity-70">Welcome Letter — Electronic Signature</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">

        {/* Letter preview card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
            <p className="font-bold text-slate-800">Employment Welcome Letter</p>
            <p className="text-xs text-slate-500 mt-0.5">{letterDate}</p>
          </div>
          <div className="px-6 py-5 space-y-4 text-sm text-slate-700">
            <p>Dear <strong>{data.staffName}</strong>,</p>
            <p>
              We are pleased to welcome you to <strong>{org.name}</strong>{data.role ? ` as a ${data.role}` : ""}. We look forward to working with you to provide exceptional care.
            </p>

            <div className={`rounded-xl border-2 p-4 text-sm ${is1099 ? "border-amber-300 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
              <p className="font-bold mb-2">{is1099 ? "Tax Status: 1099 Independent Contractor" : "Tax Status: W-2 Employee"}</p>
              {is1099 ? (
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>No taxes will be withheld from your payments.</li>
                  <li>You are solely responsible for reporting and paying all income taxes, including self-employment tax.</li>
                  <li>You may be required to make estimated quarterly tax payments.</li>
                  <li>You will receive a Form 1099-NEC if payments equal or exceed $600 in a calendar year.</li>
                </ul>
              ) : (
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Federal, state, and local taxes will be withheld from each paycheck.</li>
                  <li>You will receive a Form W-2 at year end.</li>
                  <li>The agency will match your FICA contributions.</li>
                </ul>
              )}
            </div>

            <p className="text-xs text-slate-500">
              By signing below, I acknowledge that I have read and understood the terms of my employment arrangement with <strong>{org.name}</strong>, including my tax status and obligations.
            </p>
          </div>
        </div>

        {/* Signature section */}
        {done ? (
          <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">✅</span>
              <div>
                <p className="font-bold text-emerald-800 text-lg">Signed Successfully</p>
                <p className="text-sm text-emerald-600">
                  {signedAt ? `Signed on ${new Date(signedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}
                </p>
              </div>
            </div>
            {sigUrl && (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-3">
                <p className="text-xs text-slate-500 mb-2">Your signature on file:</p>
                <img src={sigUrl} alt="Signature" className="max-h-20 object-contain" />
              </div>
            )}
            <p className="text-sm text-slate-500 mt-4">
              Thank you, <strong>{data.staffName}</strong>. Your signed letter has been recorded. You will receive a copy by email once your supervisor also signs.
            </p>

            {/* Document upload next step */}
            {data.uploadUrl && (
              <div className="mt-5 rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
                <p className="font-bold text-blue-900 text-sm mb-1">📎 Next Step: Upload Your Documents</p>
                <p className="text-blue-800 text-xs mb-3">Before your first shift, upload the following required documents. No login needed.</p>
                {data.docTypes.length > 0 && (
                  <ul className="mb-3 space-y-1">
                    {data.docTypes.map(dt => (
                      <li key={dt.id} className="flex items-center gap-2 text-xs text-blue-800">
                        <span className="text-blue-400">□</span> {dt.name}
                      </li>
                    ))}
                  </ul>
                )}
                <a href={data.uploadUrl}
                  className="inline-block w-full text-center rounded-xl py-2.5 text-white font-bold text-sm"
                  style={{ backgroundColor: org.primaryColor }}>
                  Upload My Documents →
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <p className="font-bold text-slate-900">Sign Below</p>
              <p className="text-sm text-slate-500 mt-0.5">Use your finger or mouse to draw your signature in the box below.</p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}

            {/* Canvas signature pad */}
            <div className="relative rounded-xl border-2 border-slate-300 bg-white overflow-hidden"
              style={{ height: "140px" }}>
              <canvas
                ref={canvasRef}
                className="w-full h-full touch-none cursor-crosshair"
                style={{ display: "block" }}
                onMouseDown={onStart}
                onMouseMove={onMove}
                onMouseUp={onEnd}
                onMouseLeave={onEnd}
                onTouchStart={onStart}
                onTouchMove={onMove}
                onTouchEnd={onEnd}
              />
              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-slate-300 text-sm select-none">Sign here</p>
                </div>
              )}
            </div>

            <div className="text-xs text-slate-400 border-t border-slate-100 pt-1">
              — {data.staffName}
            </div>

            <div className="flex gap-3">
              <button
                onClick={clearCanvas}
                disabled={!hasDrawn}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40"
              >
                Clear
              </button>
              <button
                onClick={handleSign}
                disabled={!hasDrawn || submitting}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 disabled:opacity-60 transition-opacity"
                style={{ backgroundColor: org.primaryColor }}
              >
                {submitting ? "Signing…" : "Submit Signature →"}
              </button>
            </div>

            <p className="text-xs text-slate-400 text-center">
              By submitting, you confirm you have read and agreed to the terms above. This constitutes a legal electronic signature.
            </p>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 pb-4">
          {org.name} · Powered by CareCompliance
        </p>
      </div>
    </div>
  );
}
