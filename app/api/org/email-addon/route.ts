import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = admin();
  const { data } = await db.from("organizations")
    .select("email_addon_status, email_addon_note")
    .eq("id", profile.facility_id)
    .maybeSingle();

  return NextResponse.json(data ?? {});
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { note } = await request.json();
  const db = admin();

  const { data: sub } = await db.from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("organization_id", profile.organization_id)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  if (!sub?.stripe_subscription_id) {
    return NextResponse.json(
      { error: "You need an active plan subscription before adding this service." },
      { status: 400 }
    );
  }

  const priceId = process.env.STRIPE_PRICE_BRANDED_EMAIL;
  if (!priceId) {
    return NextResponse.json({ error: "Branded Email Setup is not configured yet." }, { status: 500 });
  }

  const conciergeUser = process.env.CONCIERGE_EMAIL_USER;
  const conciergePass = process.env.CONCIERGE_EMAIL_APP_PASSWORD;
  const conciergeFrom = process.env.CONCIERGE_EMAIL_FROM ?? conciergeUser;
  if (!conciergeUser || !conciergePass) {
    return NextResponse.json({ error: "Branded Email Setup is not configured yet." }, { status: 500 });
  }

  try {
    const item = await stripe.subscriptionItems.create({
      subscription: sub.stripe_subscription_id,
      price: priceId,
    });

    // Auto-activate immediately: route through the shared concierge mailbox
    // with the org's own name as the display name. No manual setup needed.
    const { error } = await db.from("organizations").update({
      email_addon_status: "active",
      email_addon_subscription_item_id: item.id,
      email_addon_note: note || null,
      smtp_host:       "smtp.gmail.com",
      smtp_port:       587,
      smtp_user:       conciergeUser,
      smtp_pass:       conciergePass,
      smtp_from_name:  profile.organizations?.name ?? null,
      smtp_from_email: conciergeFrom,
    }).eq("id", profile.facility_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = admin();
  const { data: org } = await db.from("organizations")
    .select("email_addon_subscription_item_id")
    .eq("id", profile.facility_id)
    .maybeSingle();

  if (org?.email_addon_subscription_item_id) {
    try {
      await stripe.subscriptionItems.del(org.email_addon_subscription_item_id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  const { error } = await db.from("organizations").update({
    email_addon_status: "cancelled",
    email_addon_subscription_item_id: null,
  }).eq("id", profile.facility_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
