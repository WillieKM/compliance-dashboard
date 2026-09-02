import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { createClient as admin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const purple = "#9333ea";

function adminClient() {
  return admin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const TIME_SLOTS = [
  { id: "morning",   label: "🌅 Morning",    time: "6:00 AM – 12:00 PM" },
  { id: "afternoon", label: "☀️ Afternoon",  time: "12:00 PM – 6:00 PM" },
  { id: "evening",   label: "🌙 Evening",    time: "6:00 PM – 10:00 PM" },
  { id: "bedtime",   label: "💤 Bedtime",    time: "10:00 PM+" },
  { id: "prn",       label: "⚡ PRN",        time: "As needed" },
];

export default async function TodaysMARPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const fid = profile.facility_id;
  const today = new Date().toISOString().split("T")[0];
  const todayDisplay = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  // Get all active medications with today's log entries
  const [{ data: meds }, { data: todayLogs }] = await Promise.all([
    supabase.from("medication_records")
      .select("*")
      .eq("facility_id", fid)
      .eq("status", "active")
      .order("resident_name")
      .order("time_slot"),
    supabase.from("mar_log")
      .select("*")
      .eq("facility_id", fid)
      .gte("administered_at", `${today}T00:00:00Z`)
      .lte("administered_at", `${today}T23:59:59Z`),
  ]);

  const allMeds = meds ?? [];
  const logs    = todayLogs ?? [];

  const totalDoses    = allMeds.filter(m => m.time_slot !== "prn").length;
  const givenDoses    = logs.filter(l => l.given).length;
  const missedDoses   = logs.filter(l => !l.given).length;
  const pendingDoses  = totalDoses - givenDoses - missedDoses;
  const controlled    = allMeds.filter(m => m.is_controlled);

  // Group meds by time slot
  const medsBySlot: Record<string, typeof allMeds> = {};
  TIME_SLOTS.forEach(slot => {
    medsBySlot[slot.id] = allMeds.filter(m => m.time_slot === slot.id || (!m.time_slot && slot.id === "morning"));
  });

  function getMedLog(medId: string) {
    return logs.find(l => l.medication_id === medId);
  }

  async function markAdministered(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;
    const medId  = String(formData.get("med_id"));
    const given  = formData.get("given") !== "not_given";
    const staffName = String(formData.get("staff_name") || "");
    const reason = String(formData.get("reason") || "") || null;
    const med = (meds ?? []).find(m => m.id === medId);

    await adminClient().from("mar_log").insert({
      facility_id:      p.facility_id,
      medication_id:    medId,
      resident_name:    med?.resident_name ?? "",
      medication_name:  med?.medication_name ?? "",
      administered_at:  new Date().toISOString(),
      administered_by:  staffName,
      given,
      reason_not_given: !given ? reason : null,
    });
    revalidatePath("/dashboard/assisted-living/medications/today");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${purple}, #6b21a8)` }}>
        <Link href="/dashboard/assisted-living/medications" className="text-white/70 text-sm hover:text-white mb-1 inline-block">← MAR</Link>
        <h1 className="text-2xl font-bold">Today&apos;s eMAR</h1>
        <p className="text-white/70 text-sm mt-0.5">{todayDisplay}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Doses",   value: totalDoses,   cls: "bg-white border-slate-200" },
          { label: "Given ✓",       value: givenDoses,   cls: givenDoses > 0 ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-white border-slate-200" },
          { label: "Pending",       value: pendingDoses, cls: pendingDoses > 0 ? "bg-purple-50 border-purple-200 text-purple-800" : "bg-white border-slate-200" },
          { label: "Not Given",     value: missedDoses,  cls: missedDoses > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-white border-slate-200" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-2 p-4 text-center shadow-sm ${s.cls}`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs font-semibold mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Controlled substance alert */}
      {controlled.length > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-900 mb-1">⚠ {controlled.length} Controlled Substance{controlled.length > 1 ? "s" : ""} — Count Required</p>
          <p className="text-sm text-red-700">WAC 388-78A-2570 requires controlled substance reconciliation. Verify count before and after each administration.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {controlled.map(m => (
              <span key={m.id} className="text-xs bg-white border border-red-200 text-red-800 px-2 py-0.5 rounded-full font-medium">
                {m.resident_name} — {m.medication_name} ({m.dosage})
              </span>
            ))}
          </div>
        </div>
      )}

      {allMeds.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">💊</p>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No active medications</h3>
          <p className="text-slate-500 mb-4">Add medications to start tracking daily administration.</p>
          <Link href="/dashboard/assisted-living/medications/new" className="inline-block px-6 py-2.5 rounded-lg text-white font-bold text-sm" style={{ backgroundColor: purple }}>
            Add Medication
          </Link>
        </div>
      ) : (
        TIME_SLOTS.map(slot => {
          const slotMeds = medsBySlot[slot.id] ?? [];
          if (slotMeds.length === 0) return null;
          return (
            <div key={slot.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b flex items-center justify-between" style={{ backgroundColor: purple + "15" }}>
                <div>
                  <h2 className="font-bold text-slate-900">{slot.label}</h2>
                  <p className="text-xs text-slate-500">{slot.time}</p>
                </div>
                <span className="text-xs font-semibold text-slate-600">
                  {slotMeds.filter(m => getMedLog(m.id)?.given).length}/{slotMeds.length} given
                </span>
              </div>

              <div className="divide-y divide-slate-50">
                {slotMeds.map(med => {
                  const log = getMedLog(med.id);
                  return (
                    <div key={med.id} className="p-4 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900">{med.resident_name}</span>
                          <span className="text-slate-400">·</span>
                          <span className="font-medium text-slate-700">{med.medication_name}</span>
                          <span className="text-xs text-slate-500">{med.dosage}</span>
                          {med.route && <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded capitalize">{med.route}</span>}
                          {med.is_controlled && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">Controlled</span>}
                        </div>
                        {med.purpose && <p className="text-xs text-slate-400 mt-0.5">{med.purpose}</p>}

                        {log && (
                          <div className={`mt-2 text-xs px-2 py-1 rounded-lg inline-flex items-center gap-1 ${log.given ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                            {log.given ? "✓ Given" : "✕ Not Given"}
                            {log.administered_by && ` by ${log.administered_by}`}
                            {!log.given && log.reason_not_given && ` — ${log.reason_not_given}`}
                            <span className="opacity-60 ml-1">
                              {log.administered_at ? new Date(log.administered_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action */}
                      {!log ? (
                        <form action={markAdministered} className="flex flex-col gap-1.5 shrink-0">
                          <input type="hidden" name="med_id" value={med.id} />
                          <input type="text" name="staff_name" required placeholder="Staff initials *" className="text-xs border border-slate-300 rounded px-2 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-purple-400" />
                          <div className="flex gap-1">
                            <button name="given" value="given" type="submit"
                              className="flex-1 text-xs bg-emerald-600 text-white hover:bg-emerald-700 px-2 py-1.5 rounded font-bold transition-colors">
                              ✓ Given
                            </button>
                            <button name="given" value="not_given" type="submit"
                              className="flex-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1.5 rounded font-bold transition-colors">
                              ✕
                            </button>
                          </div>
                        </form>
                      ) : (
                        <span className={`text-xs px-2 py-1 rounded-full font-bold shrink-0 ${log.given ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {log.given ? "Done" : "Skipped"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      <div className="flex justify-between items-center pt-2">
        <Link href="/dashboard/assisted-living/medications" className="text-sm text-slate-500 hover:underline">← All Medications</Link>
        <Link href="/dashboard/assisted-living/medications/new" className="text-sm font-semibold hover:underline" style={{ color: purple }}>+ Add Medication</Link>
      </div>
    </div>
  );
}
