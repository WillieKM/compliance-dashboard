import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    await supabase.from("subscriptions").upsert({
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      plan_id: session.metadata?.planId ?? "professional",
      status: "active",
      updated_at: new Date().toISOString(),
    }, { onConflict: "stripe_customer_id" });
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    await supabase
      .from("subscriptions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", sub.id);
  }

  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object;
    await supabase
      .from("subscriptions")
      .update({ status: sub.status, updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", sub.id);
  }

  return NextResponse.json({ received: true });
}
