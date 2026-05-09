"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Sidebar() {

  async function handleLogout() {
    await supabase.auth.signOut();

    window.location.assign("/login");
  }

  return (
    <aside className="w-72 min-h-screen bg-[#0F172A] text-white p-6 flex flex-col">

      <div>
        <h2 className="text-3xl font-bold mb-2">
          CareCompliance
        </h2>

        <p className="text-slate-400 text-sm mb-10">
          Compliance Management Platform
        </p>
      </div>

      <nav className="space-y-3 flex-1">

        <Link
          href="/dashboard"
          className="block rounded-xl px-4 py-3 hover:bg-slate-800 transition"
        >
          Dashboard
        </Link>

        <Link
          href="/residents"
          className="block rounded-xl px-4 py-3 hover:bg-slate-800 transition"
        >
          Residents
        </Link>

        <Link
          href="/documents"
          className="block rounded-xl px-4 py-3 hover:bg-slate-800 transition"
        >
          Documents
        </Link>

        <Link
          href="/checklist"
          className="block rounded-xl px-4 py-3 hover:bg-slate-800 transition"
        >
          Compliance Checklist
        </Link>

        <Link
          href="/alerts"
          className="block rounded-xl px-4 py-3 hover:bg-slate-800 transition"
        >
          Alerts
        </Link>

        <Link
          href="/billing"
          className="block rounded-xl px-4 py-3 hover:bg-slate-800 transition"
        >
          Billing
        </Link>

        <Link
          href="/admin"
          className="block rounded-xl px-4 py-3 hover:bg-slate-800 transition"
        >
          Admin
        </Link>

      </nav>

      <button
        onClick={handleLogout}
        className="mt-10 w-full bg-red-600 hover:bg-red-700 transition text-white p-3 rounded-xl"
      >
        Logout
      </button>

    </aside>
  );
}