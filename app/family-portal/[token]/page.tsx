"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

type OrgInfo = { name: string; primary_color: string | null; logo_url: string | null };
type UpcomingVisit = { id: string; caregiver_name: string | null; scheduled_date: string; start_time: string | null; end_time: string | null; care_type: string | null; status: string };
type RecentVisit = { id: string; caregiverName: string | null; clockInTime: string; clockOutTime: string | null; durationMinutes: number | null; mood: string | null; notes: string | null };
type ThreadMessage = { id: string; sender_role: string; sender_name: string; body: string; created_at: string };

type PageData = {
  residentName: string;
  org: OrgInfo | null;
  upcomingVisits: UpcomingVisit[];
  recentVisits: RecentVisit[];
};

export default function FamilyPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PageData | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [senderName, setSenderName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [newMessageBody, setNewMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const loadedName = useRef(false);

  useEffect(() => {
    fetch(`/api/family-portal/${token}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setData(d); else setNotFound(true); })
      .catch(() => setNotFound(true));
  }, [token]);

  useEffect(() => {
    if (loadedName.current) return;
    loadedName.current = true;
    const stored = localStorage.getItem(`family-portal-name-${token}`);
    if (stored) setSenderName(stored);
  }, [token]);

  useEffect(() => {
    if (!senderName) return;
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/family-portal/${token}/messages`);
      const json = await res.json();
      if (!cancelled && json.messages) setMessages(json.messages);
    }
    load();
    const interval = setInterval(load, 7000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [senderName, token]);

  function saveSenderName() {
    if (!nameDraft.trim()) return;
    localStorage.setItem(`family-portal-name-${token}`, nameDraft.trim());
    setSenderName(nameDraft.trim());
  }

  async function sendMessage() {
    if (!newMessageBody.trim() || !senderName) return;
    setSendingMessage(true);
    const res = await fetch(`/api/family-portal/${token}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderName, body: newMessageBody }),
    });
    if (res.ok) {
      setNewMessageBody("");
      const updated = await fetch(`/api/family-portal/${token}/messages`).then(r => r.json());
      if (updated.messages) setMessages(updated.messages);
    }
    setSendingMessage(false);
  }

  function fmtDate(s: string) {
    return new Date(`${s}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }
  function fmt12h(t: string | null) {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  }

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-sm">
        <p className="text-4xl mb-3">🔗</p>
        <p className="font-bold text-slate-800">Link not found</p>
        <p className="text-slate-500 text-sm mt-1">This family portal link is invalid. Please contact the agency for a new link.</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const color = data.org?.primary_color ?? "#1a3a52";
  const agencyName = data.org?.name ?? "Your Agency";
  const inp = "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2";

  return (
    <div className="min-h-screen pb-16" style={{ background: "#f8fafc" }}>
      <div className="text-white px-5 py-5 flex items-center gap-3" style={{ backgroundColor: color }}>
        {data.org?.logo_url
          ? <img src={data.org.logo_url} alt="" className="h-10 w-10 rounded-xl object-contain bg-white/10 p-0.5" />
          : <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">{agencyName.slice(0, 2).toUpperCase()}</div>}
        <div>
          <p className="font-bold text-lg leading-tight">{agencyName}</p>
          <p className="text-sm opacity-70">Family Portal · {data.residentName}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* Upcoming visits */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-slate-50">
            <p className="font-bold text-slate-700 text-sm">Upcoming Visits</p>
          </div>
          {data.upcomingVisits.length === 0 ? (
            <p className="p-5 text-sm text-slate-400">No upcoming visits scheduled.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.upcomingVisits.map(v => (
                <div key={v.id} className="p-4">
                  <p className="font-semibold text-sm text-slate-900">{fmtDate(v.scheduled_date)}{v.start_time ? ` · ${fmt12h(v.start_time)}${v.end_time ? ` – ${fmt12h(v.end_time)}` : ""}` : ""}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{v.caregiver_name ?? "Caregiver TBD"}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent visit history */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-slate-50">
            <p className="font-bold text-slate-700 text-sm">Recent Visits</p>
          </div>
          {data.recentVisits.length === 0 ? (
            <p className="p-5 text-sm text-slate-400">No completed visits in the last 30 days yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentVisits.map(v => (
                <div key={v.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-slate-900">{v.caregiverName ?? "Caregiver"}</p>
                    <p className="text-xs text-slate-400">{new Date(v.clockInTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                  </div>
                  {v.durationMinutes && <p className="text-xs text-slate-500 mt-0.5">{Math.floor(v.durationMinutes / 60)}h {v.durationMinutes % 60}m visit</p>}
                  {v.mood && <p className="text-xs text-slate-500 mt-1">Mood: {v.mood}</p>}
                  {v.notes && <p className="text-sm text-slate-600 mt-1.5 bg-slate-50 rounded-lg p-2.5">{v.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message the office */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-slate-50">
            <p className="font-bold text-slate-700 text-sm">Message the Office</p>
          </div>
          {!senderName ? (
            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-500">Enter your name to start messaging the office.</p>
              <input type="text" value={nameDraft} onChange={e => setNameDraft(e.target.value)} placeholder="Your name" className={inp} />
              <button onClick={saveSenderName} disabled={!nameDraft.trim()}
                className="w-full rounded-xl py-2.5 font-bold text-sm text-white disabled:opacity-50" style={{ backgroundColor: color }}>
                Continue
              </button>
            </div>
          ) : (
            <div className="p-4">
              <div className="space-y-3 mb-3 max-h-72 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-4">No messages yet — send one below.</p>
                ) : messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_role === "office" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm ${m.sender_role === "office" ? "bg-slate-100 text-slate-800" : "text-white"}`} style={m.sender_role !== "office" ? { backgroundColor: color } : undefined}>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className="text-[11px] mt-1 opacity-70">{new Date(m.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newMessageBody} onChange={e => setNewMessageBody(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") sendMessage(); }}
                  placeholder="Type a message…" className={`${inp} flex-1`} />
                <button onClick={sendMessage} disabled={sendingMessage || !newMessageBody.trim()}
                  className="px-5 rounded-xl font-bold text-white disabled:opacity-50" style={{ backgroundColor: color }}>
                  Send
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 pb-4">
          This link is unique to your family member's care record. Please don't share it.
        </p>
      </div>
    </div>
  );
}
