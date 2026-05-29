import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";

const PRICE_MAP: Record<string, string | undefined> = {
  "HOME_CARE":       process.env.STRIPE_PRICE_HOME_CARE_REGULAR,
  "AFH":             process.env.STRIPE_PRICE_AFH_REGULAR,
  "ASSISTED_LIVING": process.env.STRIPE_PRICE_ASSISTED_LIVING_REGULAR,
  "MULTI_SERVICE":   process.env.STRIPE_PRICE_MULTI_SERVICE_REGULAR,
};

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { settingId } = await request.json();
  const finalPriceId = PRICE_MAP[settingId];

  if (!finalPriceId || !finalPriceId.startsWith("price_")) {
    return NextResponse.json(
      { error: `Plan not configured. Add STRIPE_PRICE_${settingId}_REGULAR to Vercel environment variables.` },
      { status: 500 }
    );
  }

  const origin = request.headers.get("origin") ?? "http://localhost:3000";
  const couponId = process.env.STRIPE_COUPON_INTRO_YEAR;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: finalPriceId, quantity: 1 }],
      ...(couponId ? { discounts: [{ coupon: couponId }] } : { allow_promotion_codes: true }),
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing/cancel`,
      billing_address_collection: "auto",
      metadata: {
        organization_id: profile.organization_id,
        plan_id: settingId,
      },
    });
    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stripe checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
