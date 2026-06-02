"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type ShiftData = {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string | null;
  status: string;
  notes: string | null;
  staff: { first_name: string; last_name: string } | null;
  residents: { first_name: string; last_name: string; address: string | null } | null;
  organizations: { name: string; primary_color: string | null; logo_url: string | null } | null;
  clockInUrl: string | null;
};

function fmt12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export default function AcceptShiftPage() {
  const { id } = useParams<{ id: string }>();
  const [shift, setShift]         = useState<ShiftData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [action, setAction]       = useState<"accepted" | "declined" | null>(null);
  const [clockInUrl, setClockInUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/shifts/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setShift(d); if (d.status === "accepted" && d.clockInUrl) { setAction("accepted"); setClockInUrl(d.clockInUrl); } if (d.status === "declined") setAction("declined"); } else setLoadError(true); })
      .catch(() => setLoadError(true));
  }, [id]);

  async function respond(a: "accept" | "decline") {
    setSubmitting(true);
    const res = await fetch(`/api/shifts/${id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: a }),
    });
    const data = await res.json();
    setAction(a === "accept" ? "accepted" : "declined");
    if (data.clockInUrl) setClockInUrl(data.clockInUrl);
    setSubmitting(false);
  }

  if (loadError) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-sm">
        <p className="text-4xl mb-3">🔍</p>
        <p className="font-bold text-slate-800">Shift not found</p>
        <p className="text-slate-500 text-sm mt-1">This link may have expired or already been used.</p>
      </div>
    </div>
  );

  if (!shift) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const org         = shift.organizations;
  const color       = org?.primary_color ?? "#1a3a52";
  const agencyName  = org?.name ?? "Your Agency";
  const caregiverName = shift.staff ? `${shift.staff.first_name} ${shift.staff.last_name}` : "Caregiver";
  const clientName    = shift.residents ? `${shift.residents.first_name} ${shift.residents.last_name}` : null;
  const dateLabel     = new Date(`${shift.shift_date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeLabel     = `${fmt12h(shift.start_time)}${shift.end_time ? ` – ${fmt12h(shift.end_time)}` : ""}`;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-md mx-auto space-y-4">

        {/* Agency header */}
        <div className="rounded-2xl text-white p-5 flex items-center gap-3" style={{ backgroundColor: color }}>
          {org?.logo_url
            ? <img src={org.logo_url} alt="" className="h-10 w-10 rounded-xl object-contain bg-white/10 p-0.5" />
            : <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">{agencyName.slice(0, 2).toUpperCase()}</div>
          }
          <div>
            <p className="font-bold text-lg">{agencyName}</p>
            <p className="text-sm opacity-70">Shift Assignment</p>
          </div>
        </div>

        {/* Shift details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Caregiver</p>
            <p className="font-bold text-slate-900 text-lg">{caregiverName}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Date</p>
              <p className="font-semibold text-slate-800 text-sm">{dateLabel}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Time</p>
              <p className="font-semibold text-slate-800 text-sm">{timeLabel}</p>
            </div>
          </div>
          {clientName && (
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Client</p>
              <p className="font-semibold text-slate-800">{clientName}</p>
            </div>
          )}
          {shift.residents?.address && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">📍 Clock In At This Address</p>
              <p className="font-semibold text-blue-900">{shift.residents.address}</p>
            </div>
          )}
          {shift.notes && (
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-slate-700">{shift.notes}</p>
            </div>
          )}
        </div>

        {/* Response section */}
        {!action && shift.status !== "completed" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <p className="font-semibold text-slate-800">Can you make this shift?</p>
            <button
              onClick={() => respond("accept")}
              disabled={submitting}
              className="w-full rounded-xl py-3.5 text-base font-bold text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
              style={{ backgroundColor: color }}
            >
              {submitting ? "Saving…" : "✓ Accept Shift"}
            </button>
            <button
              onClick={() => respond("decline")}
              disabled={submitting}
              className="w-full rounded-xl py-3 text-base font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-60 transition-colors"
            >
              Decline
            </button>
          </div>
        )}

        {/* Accepted state */}
        {action === "accepted" && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 text-center space-y-4">
            <p className="text-4xl">✅</p>
            <div>
              <p className="font-bold text-emerald-900 text-xl">Shift Accepted!</p>
              <p className="text-emerald-700 text-sm mt-1">See you on {dateLabel}.</p>
            </div>
            {clockInUrl && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-emerald-800">Your personal clock-in link:</p>
                <a
                  href={clockInUrl}
                  className="block w-full rounded-xl py-3.5 text-base font-bold text-white hover:opacity-90 transition-opacity text-center"
                  style={{ backgroundColor: color }}
                >
                  🟢 Go to Clock-In →
                </a>
                <p className="text-xs text-emerald-600">Bookmark this link — it pre-fills your name and client details.</p>
              </div>
            )}
          </div>
        )}

        {/* Declined state */}
        {action === "declined" && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-3xl mb-2">👋</p>
            <p className="font-bold text-slate-700">Shift Declined</p>
            <p className="text-slate-500 text-sm mt-1">Your supervisor has been notified. Thank you for responding.</p>
          </div>
        )}

        {shift.status === "completed" && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-3xl mb-2">✔</p>
            <p className="font-bold text-slate-700">Shift Completed</p>
          </div>
        )}
      </div>
    </div>
  );
}
