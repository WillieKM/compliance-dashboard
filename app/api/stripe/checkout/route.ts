import { NextResponse } from "next/server";
import { stripe, PLANS } from "@/lib/stripe";

export async function POST(request: Request) {
  const { planId } = await request.json();

  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  if (!plan.priceId) {
    return NextResponse.json(
      { error: "Plan not configured. Add STRIPE_PRICE_* to .env.local." },
      { status: 500 }
    );
  }

  const origin = request.headers.get("origin") ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/billing/cancel`,
    billing_address_collection: "auto",
    allow_promotion_codes: true,
    metadata: { planId: plan.id },
  });

  return NextResponse.json({ url: session.url });
}
