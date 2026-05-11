"use client";

import { usePathname } from "next/navigation";

const PUBLIC_PATHS = ["/apply", "/login", "/signup", "/dashboard/home-care/visits/clock-in", "/dashboard/home-care/visits/notes", "/portal"];

export default function ConditionalSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return null;
  return <>{children}</>;
}
