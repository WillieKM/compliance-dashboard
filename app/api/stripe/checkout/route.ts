import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

// Single price per care setting — server-side only
const PRICE_MAP: Record<string, string | undefined> = {
  "HOME_CARE":       process.env.STRIPE_PRICE_HOME_CARE,
  "AFH":             process.env.STRIPE_PRICE_AFH,
  "ASSISTED_LIVING": process.env.STRIPE_PRICE_ASSISTED_LIVING,
  "MULTI_SERVICE":   process.env.STRIPE_PRICE_MULTI_SERVICE,
};

export async function POST(request: Request) {
  const { settingId } = await request.json();

  const finalPriceId = PRICE_MAP[settingId];

  if (!finalPriceId || !finalPriceId.startsWith("price_")) {
    return NextResponse.json(
      { error: `Plan not configured. Add STRIPE_PRICE_${settingId} to Vercel environment variables.` },
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
