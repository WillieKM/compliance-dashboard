"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FACILITY_TYPES } from "@/lib/constants";

export default function FacilityTypeSelector({ defaultType }: { defaultType: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("facilityType", e.target.value);
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3">
        Care Setting
      </label>
      <select
        value={defaultType}
        onChange={handleChange}
        className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {FACILITY_TYPES.map((type) => (
          <option key={type.id} value={type.id}>
            {type.label}
          </option>
        ))}
      </select>
    </div>
  );
}
