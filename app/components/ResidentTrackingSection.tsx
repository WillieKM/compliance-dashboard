"use client";

import Link from "next/link";
import { useState } from "react";
import type { ResidentRecord, ResidentStatus } from "@/lib/types/compliance";

type Filter = "all" | ResidentStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "compliant", label: "Compliant" },
  { key: "review", label: "Needs Review" },
  { key: "overdue", label: "Overdue" },
];

const STATUS_STYLES: Record<
  ResidentStatus,
  { badge: string; label: string }
> = {
  compliant: { badge: "bg-green-100 text-green-700 border-green-200", label: "✓ Compliant" },
  review: { badge: "bg-amber-100 text-amber-700 border-amber-200", label: "⊙ Review" },
  overdue: { badge: "bg-red-100 text-red-700 border-red-200", label: "✕ Overdue" },
};

export default function ResidentTrackingSection({
  residents,
}: {
  residents: ResidentRecord[];
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts: Record<Filter, number> = {
    all: residents.length,
    compliant: residents.filter((r) => r.status === "compliant").length,
    review: residents.filter((r) => r.status === "review").length,
    overdue: residents.filter((r) => r.status === "overdue").length,
  };

  const filtered =
    filter === "all" ? residents : residents.filter((r) => r.status === filter);

  return (
    <div className="mt-12 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Resident Tracking</h2>
          <p className="mt-2 text-slate-600">
            Patient compliance status and document tracking.
          </p>
        </div>
        <Link
          href="/residents"
          className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors"
        >
          Manage All →
        </Link>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
              filter === f.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-700 border-slate-300 hover:border-blue-400 hover:text-blue-700"
            }`}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-slate-500 py-8">
          {residents.length === 0
            ? "No residents found. Add your first resident to begin tracking."
            : "No residents in this category."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((resident) => {
            const style = STATUS_STYLES[resident.status];
            return (
              <div
                key={resident.id}
                className="rounded-lg border border-slate-200 p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Link
                        href={`/residents/${resident.id}`}
                        className="font-semibold text-slate-900 hover:text-blue-700 transition-colors"
                      >
                        {resident.name}
                      </Link>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold border ${style.badge}`}
                      >
                        {style.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Admitted: {resident.admittedDate}
                    </p>
                  </div>
                  <div className="flex gap-4 text-sm text-slate-600 ml-4 shrink-0">
                    <span>
                      <span className="font-semibold text-slate-900">
                        {resident.totalDocs}
                      </span>{" "}
                      docs
                    </span>
                    {resident.pendingDocs > 0 && (
                      <span className="text-amber-600 font-semibold">
                        {resident.pendingDocs} expiring
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
