"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export default function AdminSignaturePanel({
  staffId,
  orgColor,
  onSigned,
}: {
  staffId: string;
  orgColor: string;
  onSigned: (sigUrl: string, sigAt: string) => void;
}) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const drawing    = useRef(false);
  const [hasDrawn, setHasDrawn]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
  }, []);

  function getXY(e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const src  = "touches" in e ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  const onStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    drawing.current = true;
    const pos = getXY(e.nativeEvent, canvasRef.current!);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
  }, []);

  const onMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    const pos = getXY(e.nativeEvent, canvasRef.current!);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
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
    setError("");
    const dataUrl = canvasRef.current!.toDataURL("image/png");
    const res  = await fetch(`/api/staff/${staffId}/admin-sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signatureDataUrl: dataUrl }),
    });
    const json = await res.json();
    if (json.error) { setError(json.error); setSubmitting(false); }
    else onSigned(json.adminSignatureUrl, json.adminSignedAt);
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl border-2 border-slate-300 bg-white overflow-hidden" style={{ height: 120 }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none cursor-crosshair"
          style={{ display: "block" }}
          onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
          onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-slate-300 text-sm select-none">Admin / Supervisor — sign here</p>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={clearCanvas} disabled={!hasDrawn}
          className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40">
          Clear
        </button>
        <button onClick={handleSign} disabled={!hasDrawn || submitting}
          className="flex-1 py-2 rounded-lg text-white font-bold text-sm disabled:opacity-60"
          style={{ backgroundColor: orgColor }}>
          {submitting ? "Saving…" : "Sign & Email Copy to Caregiver →"}
        </button>
      </div>
    </div>
  );
}
