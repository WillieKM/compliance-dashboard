"use client";

export default function PrintButton({ label = "🖨️ Print / Export PDF" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 print:hidden"
    >
      {label}
    </button>
  );
}
