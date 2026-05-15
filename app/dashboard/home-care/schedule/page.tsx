import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { createClient as admin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const navy = "#1a3a52";

function adminClient() {
  return admin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const STATUS_STYLE: Record<string, string> = {
  scheduled:  "bg-blue-100 text-blue-800",
  confirmed:  "bg-emerald-100 text-emerald-800",
  completed:  "bg-slate-100 text-slate-600",
  cancelled:  "bg-red-100 text-red-700",
  no_show:    "bg-orange-100 text-orange-700",
};

const CARE_TYPES: Record<string, string> = {
  home_care_visit:   "Home Care Visit",
  personal_care:     "Personal Care",
  skilled_nursing:   "Skilled Nursing",
  therapy:           "Therapy",
  companionship:     "Companionship",
  medication_assist: "Medication Assist",
  housekeeping:      "Housekeeping",
  other:             "Other",
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const params = await searchParams;

  const today = new Date().toISOString().split("T")[0];
  const selectedDate = params.date ?? today;
  const view = params.view ?? "day";

  // Get date range for week view
  const dateObj = new Date(selectedDate);
  const weekStart = new Date(dateObj);
  weekStart.setDate(dateObj.getDate() - dateObj.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const startDate = view === "week" ? weekStart.toISOString().split("T")[0] : selectedDate;
  const endDate   = view === "week" ? weekEnd.toISOString().split("T")[0]   : selectedDate;

  const { data: schedules } = await supabase
    .from("schedules")
    .select("*")
    .eq("facility_id", profile.facility_id)
    .gte("scheduled_date", startDate)
    .lte("scheduled_date", endDate)
    .order("scheduled_date")
    .order("start_time");

  const { data: staff } = await supabase
    .from("staff")
    .select("id, first_name, last_name")
    .eq("facility_id", profile.facility_id)
    .order("first_name");

  const { data: residents } = await supabase
    .from("residents")
    .select("id, first_name, last_name")
    .eq("facility_id", profile.facility_id)
    .order("first_name");

  const all = schedules ?? [];
  const todaySchedules = all.filter(s => s.scheduled_date === today);
  const upcoming = all.filter(s => s.scheduled_date > today && s.status === "scheduled");

  async function updateStatus(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    const status = String(formData.get("status"));
    await adminClient().from("schedules").update({ status }).eq("id", id);
    revalidatePath("/dashboard/home-care/schedule");
  }

  // Build week days for week view
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const prevDate = new Date(dateObj);
  prevDate.setDate(dateObj.getDate() - (view === "week" ? 7 : 1));
  const nextDate = new Date(dateObj);
  nextDate.setDate(dateObj.getDate() + (view === "week" ? 7 : 1));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-5 text-white flex items-center justify-between flex-wrap gap-4"
        style={{ background: `linear-gradient(135deg, ${navy}, #274f6e)` }}>
        <div>
          <Link href="/dashboard/home-care" className="text-white/70 text-sm hover:text-white mb-1 inline-block">← Home Care</Link>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-white/70 text-sm mt-0.5">Manage caregiver shifts and client visit assignments</p>
        </div>
        <Link href="/dashboard/home-care/schedule/new"
          className="px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90"
          style={{ backgroundColor: "#d4a574", color: navy }}>
          + Add Shift
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Today's Shifts",   value: todaySchedules.length,                                            cls: "bg-white border-slate-200" },
          { label: "Active Now",       value: todaySchedules.filter(s => s.status === "scheduled").length,      cls: "bg-blue-50 border-blue-200 text-blue-800" },
          { label: "Upcoming",         value: upcoming.length,                                                  cls: "bg-white border-slate-200" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center shadow-sm ${s.cls}`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs font-semibold mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Date nav + view toggle */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between shadow-sm">
        <Link href={`?date=${prevDate.toISOString().split("T")[0]}&view=${view}`}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold">
          ← Prev
        </Link>
        <div className="flex items-center gap-4">
          <span className="font-bold text-slate-900">
            {view === "week"
              ? `${new Date(weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(weekEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
              : new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </span>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <Link href={`?date=${selectedDate}&view=day`}
              className={`px-3 py-1.5 text-xs font-semibold ${view === "day" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              Day
            </Link>
            <Link href={`?date=${selectedDate}&view=week`}
              className={`px-3 py-1.5 text-xs font-semibold ${view === "week" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              Week
            </Link>
          </div>
          <Link href={`?date=${today}&view=${view}`}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            Today
          </Link>
        </div>
        <Link href={`?date=${nextDate.toISOString().split("T")[0]}&view=${view}`}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold">
          Next →
        </Link>
      </div>

      {/* Week view */}
      {view === "week" && (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => {
            const daySchedules = all.filter(s => s.scheduled_date === day);
            const isToday = day === today;
            return (
              <div key={day} className={`rounded-xl border-2 min-h-[120px] p-2 ${isToday ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white"}`}>
                <p className={`text-xs font-bold mb-2 ${isToday ? "text-blue-700" : "text-slate-500"}`}>
                  {new Date(day + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}
                </p>
                {daySchedules.length === 0
                  ? <p className="text-xs text-slate-300 text-center mt-4">—</p>
                  : daySchedules.map(s => (
                    <div key={s.id} className={`text-xs rounded px-1.5 py-1 mb-1 ${STATUS_STYLE[s.status] ?? "bg-slate-100 text-slate-600"}`}>
                      <p className="font-semibold truncate">{s.caregiver_name}</p>
                      <p className="truncate opacity-75">{s.client_name || "General"}</p>
                      {s.start_time && <p className="opacity-60">{s.start_time}</p>}
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Day view — shift list */}
      {view === "day" && (
        <>
          {all.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <p className="text-4xl mb-4">📅</p>
              <h3 className="text-lg font-bold text-slate-700 mb-2">No shifts scheduled</h3>
              <p className="text-slate-500 mb-4">Add a shift to assign a caregiver to a client visit.</p>
              <Link href="/dashboard/home-care/schedule/new"
                className="inline-block px-6 py-2.5 rounded-lg text-white font-bold text-sm"
                style={{ backgroundColor: navy }}>
                + Add First Shift
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {all.map(s => (
                <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-slate-900">👤 {s.caregiver_name || "Unassigned"}</span>
                      {s.client_name && <span className="text-slate-500">→ {s.client_name}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLE[s.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {s.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                      {(s.start_time || s.end_time) && (
                        <span>🕐 {s.start_time || "?"} – {s.end_time || "?"}</span>
                      )}
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded capitalize">
                        {CARE_TYPES[s.care_type] ?? s.care_type}
                      </span>
                      {s.recurrence && s.recurrence !== "none" && (
                        <span className="text-xs text-blue-600">🔄 {s.recurrence}</span>
                      )}
                    </div>
                    {s.notes && <p className="text-sm text-slate-400 mt-1 italic">{s.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <form action={updateStatus} className="flex gap-1">
                      <input type="hidden" name="id" value={s.id} />
                      {s.status === "scheduled" && (
                        <>
                          <button name="status" value="confirmed" type="submit"
                            className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded-lg font-semibold">
                            ✓ Confirm
                          </button>
                          <button name="status" value="cancelled" type="submit"
                            className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1.5 rounded-lg font-semibold">
                            ✕
                          </button>
                        </>
                      )}
                      {s.status === "confirmed" && (
                        <button name="status" value="completed" type="submit"
                          className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-semibold">
                          Mark Done
                        </button>
                      )}
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
