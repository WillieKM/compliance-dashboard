"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Subscribes to new message rows and refreshes the (server-rendered) page
// when one arrives. Realtime still enforces the existing RLS policy for the
// logged-in office session, so this only ever fires for the office's own
// facility — no new access path, just a live nudge to re-fetch.
export default function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const channel = supabase
      .channel("messages-office")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        router.refresh();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [router]);

  return null;
}
