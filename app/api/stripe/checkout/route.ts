import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

// Server-side price ID map — env vars never exposed to client
const PRICE_MAP: Record<string, string | undefined> = {
  "HOME_CARE_starter":       process.env.STRIPE_PRICE_HOME_CARE_STARTER,
  "HOME_CARE_pro":           process.env.STRIPE_PRICE_HOME_CARE_PRO,
  "AFH_starter":             process.env.STRIPE_PRICE_AFH_STARTER,
  "AFH_pro":                 process.env.STRIPE_PRICE_AFH_PRO,
  "ASSISTED_LIVING_starter": process.env.STRIPE_PRICE_AL_STARTER,
  "ASSISTED_LIVING_pro":     process.env.STRIPE_PRICE_AL_PRO,
  "MULTI_SERVICE_starter":   process.env.STRIPE_PRICE_MS_STARTER,
  "MULTI_SERVICE_pro":       process.env.STRIPE_PRICE_MS_PRO,
};

export async function POST(request: Request) {
  const { settingId, tier } = await request.json();

  const finalPriceId = PRICE_MAP[`${settingId}_${tier}`];

  if (!finalPriceId || !finalPriceId.startsWith("price_")) {
    return NextResponse.json(
      { error: `Plan not configured. Add STRIPE_PRICE_${settingId}_${tier?.toUpperCase()} to Vercel environment variables.` },
      { status: 500 }
    );
  }

  const origin = request.headers.get("origin") ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: finalPriceId, quantity: 1 }],
    success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/billing/cancel`,
    billing_address_collection: "auto",
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
