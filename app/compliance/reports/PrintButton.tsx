"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-5 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
      style={{ backgroundColor: "#1a3a52" }}
    >
      🖨 Print / Save PDF
    </button>
  );
}
