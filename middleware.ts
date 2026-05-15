import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Platform domains — these get normal session handling
const PLATFORM_HOSTS = [
  "compliance-dashboard-ruddy.vercel.app",
  "compliance.cyber-node.com",
  "cyber-node.com",
  "localhost",
  "127.0.0.1",
];

// Subdomain base — org subdomains like benmarr.compliance.cyber-node.com
const SUBDOMAIN_BASE = "compliance.cyber-node.com";

function isPlatformHost(host: string) {
  return PLATFORM_HOSTS.some(p => host === p || host.endsWith(`.${p}`) || host.includes("vercel.app"));
}

export async function middleware(request: NextRequest) {
  const host = (request.headers.get("host") || "").replace(/:.*$/, "");
  const pathname = request.nextUrl.pathname;

  // ── Custom domain / subdomain routing ─────────────────────────
  if (!isPlatformHost(host)) {
    // Could be:
    // 1. benmarr.compliance.cyber-node.com  → subdomain of platform
    // 2. compliance.benmarrhomecare.com      → client's own domain

    let slug: string | null = null;

    // Check if it's a subdomain of the platform base
    if (host.endsWith(`.${SUBDOMAIN_BASE}`)) {
      slug = host.replace(`.${SUBDOMAIN_BASE}`, "");
    }

    if (slug) {
      // Rewrite to portal routes with the slug
      const url = request.nextUrl.clone();
      if (pathname === "/" || pathname === "") {
        url.pathname = `/portal/${slug}`;
      } else {
        url.pathname = `/portal/${slug}${pathname}`;
      }
      return NextResponse.rewrite(url);
    }

    // Custom domain (not a known subdomain) — pass to custom-domain handler
    // We set a header so the page can read the hostname
    const response = NextResponse.rewrite(
      new URL(`/custom-domain?host=${encodeURIComponent(host)}&path=${encodeURIComponent(pathname)}`, request.url)
    );
    response.headers.set("x-custom-host", host);
    return response;
  }

  // ── Normal platform session refresh ───────────────────────────
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
