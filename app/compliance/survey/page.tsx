import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { WA_COLORS } from "@/lib/compliance/waComplianceUtils";

export const dynamic = "force-dynamic";

const DEFAULT_ITEMS = [
  { category: "Personnel Files",       item: "Criminal background check on file (initial + 2-yr renewal)",   wac: "WAC 246-335-085", priority: "critical" },
  { category: "Personnel Files",       item: "TB risk assessment on file (initial + annual)",                 wac: "WAC 246-335-083", priority: "critical" },
  { category: "Personnel Files",       item: "Orientation training documentation complete",                   wac: "WAC 246-335-080", priority: "high" },
  { category: "Personnel Files",       item: "Annual in-service training documented (5+ hrs)",                wac: "WAC 246-335-080", priority: "high" },
  { category: "Personnel Files",       item: "Infection control training on file",                            wac: "WAC 246-335-080", priority: "high" },
  { category: "Personnel Files",       item: "Bloodborne pathogen training on file",                          wac: "WAC 246-335-080", priority: "high" },
  { category: "Personnel Files",       item: "Mandatory reporter training documented",                        wac: "WAC 246-335-080", priority: "high" },
  { category: "Personnel Files",       item: "Emergency preparedness training documented",                    wac: "WAC 246-335-070", priority: "medium" },
  { category: "Personnel Files",       item: "Performance evaluations completed annually",                    wac: "WAC 246-335-080", priority: "medium" },
  { category: "Personnel Files",       item: "Professional licenses verified and current",                    wac: "WAC 246-335-082", priority: "critical" },
  { category: "Client Records",        item: "Initial assessment completed within required timeframe",        wac: "WAC 246-335-055", priority: "critical" },
  { category: "Client Records",        item: "Plan of care created and signed",                               wac: "WAC 246-335-055", priority: "critical" },
  { category: "Client Records",        item: "Plan of care reviewed within 60 days",                          wac: "WAC 246-335-055", priority: "critical" },
  { category: "Client Records",        item: "Visit notes filed within 7 days",                               wac: "WAC 246-335-065", priority: "high" },
  { category: "Client Records",        item: "Advance directive documentation on file",                       wac: "WAC 246-335-055", priority: "high" },
  { category: "Client Records",        item: "Current medication list on file",                               wac: "WAC 246-335-055", priority: "high" },
  { category: "Client Records",        item: "Client rights notice provided and documented",                  wac: "WAC 246-335-045", priority: "critical" },
  { category: "Policies & Procedures", item: "Infection control policy current and accessible",               wac: "WAC 246-335-075", priority: "critical" },
  { category: "Policies & Procedures", item: "Emergency preparedness plan current",                           wac: "WAC 246-335-070", priority: "critical" },
  { category: "Policies & Procedures", item: "Complaint resolution policy posted",                            wac: "WAC 246-335-045", priority: "high" },
  { category: "Policies & Procedures", item: "Mandatory reporting procedures documented",                     wac: "WAC 246-335-045", priority: "critical" },
  { category: "Agency Administration", item: "Agency license current and posted",                             wac: "WAC 246-335-010", priority: "critical" },
  { category: "Agency Administration", item: "Administrator qualifications verified",                         wac: "WAC 246-335-020", priority: "critical" },
  { category: "Agency Administration", item: "Supervisory structure documented",                              wac: "WAC 246-335-020", priority: "high" },
  { category: "Quality Improvement",   item: "QIP program documented with measurable goals",                  wac: "WAC 246-335-030", priority: "high" },
  { category: "Quality Improvement",   item: "QIP metrics tracked and reported quarterly",                    wac: "WAC 246-335-030", priority: "high" },
  { category: "Quality Improvement",   item: "Complaint log maintained with resolution tracking",             wac: "WAC 246-335-045", priority: "high" },
];

const PRIORITY_STYLE: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high:     "bg-amber-100 text-amber-700 border-amber-200",
  medium:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  low:      "bg-slate-100 text-slate-600 border-slate-200",
};

export default async function SurveyReadinessPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const fid = profile.facility_id;

  const { data: existing } = await supabase
    .from("survey_readiness")
    .select("id")
    .eq("facility_id", fid)
    .limit(1);

  if (!existing?.length) {
    await supabase.from("survey_readiness").insert(
      DEFAULT_ITEMS.map((d) => ({
        facility_id: fid,
        category: d.category,
        item_description: d.item,
        wac_reference: d.wac,
        priority: d.priority,
        is_complete: false,
      }))
    );
  }

  const { data: items } = await supabase
    .from("survey_readiness")
    .select("*")
    .eq("facility_id", fid)
    .order("category")
    .order("priority");

  const allItems = items ?? [];
  const total = allItems.length;
  const complete = allItems.filter((i) => i.is_complete).length;
  const pct = total > 0 ? Math.round((complete / total) * 100) : 0;
  const criticalLeft = allItems.filter((i) => !i.is_complete && i.priority === "critical").length;

  const grouped: Record<string, typeof allItems> = {};
  allItems.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  async function toggleItem(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    const current = formData.get("is_complete") === "true";
    const client = await createClient();
    await client.from("survey_readiness").update({
      is_complete: !current,
      completed_date: !current ? new Date().toISOString().split("T")[0] : null,
    }).eq("id", id);
    revalidatePath("/compliance/survey");
  }

  async function addCustomItem(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;
    const client = await createClient();
    await client.from("survey_readiness").insert({
      facility_id: p.facility_id,
      category: String(formData.get("category") || "Other"),
      item_description: String(formData.get("item_description")),
      wac_reference: String(formData.get("wac_reference") || "") || null,
      priority: String(formData.get("priority") || "medium"),
      is_complete: false,
    });
    revalidatePath("/compliance/survey");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: WA_COLORS.navy }}>DOH Survey Readiness</h1>
        <p className="text-slate-500 text-sm mt-0.5">WAC 246-335 · Click each item to mark it complete</p>
      </div>

      {/* Score */}
      <div className="rounded-2xl p-6 text-white" style={{ background: `linear-gradient(135deg, ${WA_COLORS.navy}, #274f6e)` }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm opacity-75 uppercase tracking-wide">Readiness Score</p>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-6xl font-bold">{pct}%</span>
              <span className="text-lg font-semibold" style={{ color: WA_COLORS.gold }}>
                {pct >= 90 ? "Survey Ready ✓" : pct >= 70 ? "Nearly Ready" : "Needs Attention"}
              </span>
            </div>
            <div className="mt-3 w-64 bg-white/20 rounded-full h-2.5">
              <div className="h-2.5 rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-sm opacity-60 mt-2">{complete} of {total} items complete</p>
          </div>
          {criticalLeft > 0 && (
            <div className="bg-red-500/20 border border-red-300/30 rounded-xl p-4">
              <p className="font-bold text-red-200">🚨 {criticalLeft} critical items remaining</p>
              <p className="text-sm text-red-300 mt-0.5">Must complete before DOH survey</p>
            </div>
          )}
        </div>
      </div>

      {/* Categories */}
      {Object.entries(grouped).map(([category, catItems]) => {
        const catDone = catItems.filter((i) => i.is_complete).length;
        const catPct = Math.round((catDone / catItems.length) * 100);
        return (
          <div key={category} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ backgroundColor: WA_COLORS.navy + "08" }}>
              <div>
                <h2 className="font-bold" style={{ color: WA_COLORS.navy }}>{category}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{catDone}/{catItems.length} complete</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 bg-slate-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${catPct}%`,
                      backgroundColor: catPct === 100 ? WA_COLORS.compliant : catPct >= 70 ? WA_COLORS.atRisk : WA_COLORS.nonCompliant,
                    }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-600">{catPct}%</span>
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {catItems.map((item) => (
                <form key={item.id} action={toggleItem} className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors">
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="is_complete" value={String(item.is_complete)} />
                  <button
                    type="submit"
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      item.is_complete
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300 hover:border-emerald-400 hover:bg-emerald-50"
                    }`}
                  >
                    {item.is_complete && <span className="text-xs font-bold leading-none">✓</span>}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm ${item.is_complete ? "line-through text-slate-400" : "text-slate-800 font-medium"}`}>
                      {item.item_description}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {item.wac_reference && (
                        <span className="text-xs font-mono text-slate-400">{item.wac_reference}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${PRIORITY_STYLE[item.priority] ?? PRIORITY_STYLE.medium}`}>
                        {item.priority}
                      </span>
                      {item.is_complete && item.completed_date && (
                        <span className="text-xs text-emerald-600">✓ {new Date(item.completed_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </form>
              ))}
            </div>
          </div>
        );
      })}

      {/* Add custom item */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="font-bold text-slate-900 mb-4">Add Custom Item</h2>
        <form action={addCustomItem} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <input type="text" name="item_description" required placeholder="Checklist item description..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select name="category" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {["Personnel Files","Client Records","Policies & Procedures","Agency Administration","Quality Improvement","Other"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <select name="priority" className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <input type="text" name="wac_reference" placeholder="WAC ref (optional)"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" className="px-6 py-2.5 rounded-lg text-white text-sm font-bold hover:opacity-90" style={{ backgroundColor: WA_COLORS.navy }}>
            + Add Item
          </button>
        </form>
      </div>
    </div>
  );
}
