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

function fmt12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

const STATUS_STYLE: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-800",
  accepted:  "bg-emerald-100 text-emerald-800",
  declined:  "bg-red-100 text-red-700",
  completed: "bg-slate-100 text-slate-600",
};

type Shift = {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string | null;
  status: string;
  notes: string | null;
  staff: { first_name: string; last_name: string; email: string | null } | null;
  residents: { first_name: string; last_name: string; address: string | null } | null;
};

export default async function ShiftsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);

  const { data } = await admin()
    .from("shifts")
    .select("id, shift_date, start_time, end_time, status, notes, staff(first_name, last_name, email), residents(first_name, last_name, address)")
    .eq("facility_id", profile.facility_id)
    .order("shift_date", { ascending: true })
    .order("start_time", { ascending: true });

  const shifts = (data ?? []) as unknown as Shift[];
  const upcoming = shifts.filter(s => s.shift_date >= today && s.status !== "completed" && s.status !== "declined");
  const past     = shifts.filter(s => s.shift_date < today || s.status === "completed" || s.status === "declined");

  const pending  = upcoming.filter(s => s.status === "pending").length;
  const accepted = upcoming.filter(s => s.status === "accepted").length;

  function ShiftRow({ s }: { s: Shift }) {
    const staffName = s.staff ? `${s.staff.first_name} ${s.staff.last_name}` : "—";
    const clientName = s.residents ? `${s.residents.first_name} ${s.residents.last_name}` : "—";
    const date = new Date(`${s.shift_date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const time = `${fmt12h(s.start_time)}${s.end_time ? ` – ${fmt12h(s.end_time)}` : ""}`;

    return (
      <div className="flex items-center gap-4 p-4 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex-wrap">
        <div className="w-28 shrink-0">
          <p className="font-semibold text-slate-900 text-sm">{date}</p>
          <p className="text-xs text-slate-400">{time}</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate">👤 {staffName}</p>
          {s.staff?.email && <p className="text-xs text-slate-400 truncate">{s.staff.email}</p>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-700 truncate">→ {clientName}</p>
          {s.residents?.address && <p className="text-xs text-slate-400 truncate">📍 {s.residents.address}</p>}
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLE[s.status] ?? "bg-slate-100 text-slate-600"}`}>
          {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
        </span>
        <Link href={`/shifts/${s.id}/accept`} className="text-xs text-blue-600 hover:underline shrink-0">
          View →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Shift Assignments</h1>
          <p className="text-slate-500 mt-1 text-sm">Assign caregivers to clients and send shift notifications by email.</p>
        </div>
        <Link href="/shifts/new" className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 text-sm">
          + Assign Shift
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Upcoming",        value: upcoming.length,  cls: "bg-white" },
          { label: "Awaiting Response", value: pending,         cls: pending > 0 ? "bg-amber-50 border-amber-200" : "bg-white" },
          { label: "Accepted",        value: accepted,          cls: accepted > 0 ? "bg-emerald-50 border-emerald-200" : "bg-white" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border border-slate-200 p-4 text-center shadow-sm ${s.cls}`}>
            <p className="text-3xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Upcoming shifts */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-white">Upcoming Shifts ({upcoming.length})</h2>
        </div>
        {upcoming.length === 0
          ? <p className="text-slate-400 text-center py-10">No upcoming shifts. <Link href="/shifts/new" className="text-blue-600 hover:underline">Assign one →</Link></p>
          : upcoming.map(s => <ShiftRow key={s.id} s={s} />)
        }
      </div>

      {/* Past / completed */}
      {past.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-slate-50">
            <h2 className="font-bold text-slate-600">Past Shifts ({past.length})</h2>
          </div>
          <div className="opacity-70">
            {past.slice(0, 20).map(s => <ShiftRow key={s.id} s={s} />)}
          </div>
        </div>
      )}
    </div>
  );
}
