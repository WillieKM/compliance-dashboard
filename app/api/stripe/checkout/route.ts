import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const { priceId, planId } = await request.json();

  // Support both direct priceId and legacy planId
  const finalPriceId = priceId || planId;

  if (!finalPriceId) {
    return NextResponse.json({ error: "Price ID required" }, { status: 400 });
  }

  if (finalPriceId.startsWith("price_placeholder") || !finalPriceId.startsWith("price_")) {
    return NextResponse.json(
      { error: "Payment not configured yet. Add Stripe price IDs to environment variables." },
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
