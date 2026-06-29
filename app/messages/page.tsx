import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient as admin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const navy = "#1a3a52";

function adminClient() {
  return admin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

type Message = {
  id: string;
  channel: string;
  staff_id: string | null;
  resident_id: string | null;
  sender_role: string;
  sender_name: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string; id?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { channel: activeChannel, id: activeId } = await searchParams;
  const db = adminClient();

  const [{ data: messages }, { data: staffList }, { data: residents }] = await Promise.all([
    db.from("messages").select("*").eq("facility_id", profile.facility_id).order("created_at", { ascending: true }),
    db.from("staff").select("id, first_name, last_name").eq("facility_id", profile.facility_id),
    db.from("residents").select("id, first_name, last_name").eq("facility_id", profile.facility_id),
  ]);

  const all = (messages ?? []) as Message[];
  const staffName = new Map((staffList ?? []).map(s => [s.id, `${s.first_name} ${s.last_name}`]));
  const residentName = new Map((residents ?? []).map(r => [r.id, `${r.first_name} ${r.last_name}`]));

  type Thread = { channel: string; id: string; name: string; messages: Message[] };
  const threadMap = new Map<string, Thread>();
  for (const m of all) {
    const id = m.channel === "caregiver" ? m.staff_id : m.resident_id;
    if (!id) continue;
    const key = `${m.channel}:${id}`;
    const name = m.channel === "caregiver" ? (staffName.get(id) ?? "Unknown Caregiver") : (residentName.get(id) ?? "Unknown Family");
    if (!threadMap.has(key)) threadMap.set(key, { channel: m.channel, id, name, messages: [] });
    threadMap.get(key)!.messages.push(m);
  }
  const threads = Array.from(threadMap.values()).sort((a, b) => {
    const aLast = a.messages[a.messages.length - 1]?.created_at ?? "";
    const bLast = b.messages[b.messages.length - 1]?.created_at ?? "";
    return bLast.localeCompare(aLast);
  });

  const activeThread = activeChannel && activeId
    ? threadMap.get(`${activeChannel}:${activeId}`)
    : threads[0];

  // Mark inbound messages in the open thread as read.
  if (activeThread) {
    const unreadIds = activeThread.messages.filter(m => m.sender_role !== "office" && !m.read_at).map(m => m.id);
    if (unreadIds.length > 0) {
      await db.from("messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
    }
  }

  async function sendReply(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) return;
    const channel = String(formData.get("channel") || "");
    const id = String(formData.get("thread_id") || "");
    const body = String(formData.get("body") || "").trim();
    if (!channel || !id || !body) return;

    await adminClient().from("messages").insert({
      facility_id: p.facility_id,
      channel,
      staff_id: channel === "caregiver" ? id : null,
      resident_id: channel === "family" ? id : null,
      sender_role: "office",
      sender_name: p.full_name ?? p.organizations?.name ?? "Office",
      body,
    });
    revalidatePath("/messages");
  }

  function fmtTime(s: string) {
    return new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${navy}, #274f6e)` }}>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-white/70 text-sm mt-0.5">Caregiver and family messages, in one place</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Thread list */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden lg:col-span-1">
          {threads.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No messages yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {threads.map(t => {
                const last = t.messages[t.messages.length - 1];
                const unread = t.messages.some(m => m.sender_role !== "office" && !m.read_at);
                const isActive = activeThread?.channel === t.channel && activeThread?.id === t.id;
                return (
                  <Link key={`${t.channel}:${t.id}`} href={`/messages?channel=${t.channel}&id=${t.id}`}
                    className={`block p-4 hover:bg-slate-50 ${isActive ? "bg-blue-50" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 text-sm truncate">
                        {t.channel === "caregiver" ? "💬" : "👨‍👩‍👧"} {t.name}
                      </span>
                      {unread && <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{last?.body}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Active thread */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:col-span-2 min-h-[400px]">
          {!activeThread ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Select a conversation</div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-slate-100">
                <p className="font-bold text-slate-900">{activeThread.channel === "caregiver" ? "💬" : "👨‍👩‍👧"} {activeThread.name}</p>
              </div>
              <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                {activeThread.messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_role === "office" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm ${m.sender_role === "office" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className={`text-[11px] mt-1 ${m.sender_role === "office" ? "text-blue-100" : "text-slate-400"}`}>{m.sender_name} · {fmtTime(m.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form action={sendReply} className="p-3 border-t border-slate-100 flex gap-2">
                <input type="hidden" name="channel" value={activeThread.channel} />
                <input type="hidden" name="thread_id" value={activeThread.id} />
                <input type="text" name="body" required placeholder="Type a reply…"
                  className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="submit" className="px-5 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90" style={{ backgroundColor: navy }}>
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
