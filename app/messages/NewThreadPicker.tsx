"use client";

import { useRouter } from "next/navigation";

type Person = { id: string; name: string };

export default function NewThreadPicker({ staff, residents }: { staff: Person[]; residents: Person[] }) {
  const router = useRouter();
  const selectCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="p-3 border-b border-slate-100 space-y-2 bg-slate-50">
      <select
        className={selectCls}
        defaultValue=""
        onChange={e => { if (e.target.value) router.push(`/messages?channel=caregiver&id=${e.target.value}`); }}
      >
        <option value="">💬 Message a caregiver…</option>
        {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <select
        className={selectCls}
        defaultValue=""
        onChange={e => { if (e.target.value) router.push(`/messages?channel=family&id=${e.target.value}`); }}
      >
        <option value="">👨‍👩‍👧 Message a family contact…</option>
        {residents.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
    </div>
  );
}
