import Stripe from "stripe";
import { readFileSync } from "fs";

function getEnvVar(name) {
  try {
    const env = readFileSync(".env.local", "utf8");
    const match = env.match(new RegExp(`^${name}=(.+)$`, "m"));
    return match?.[1]?.trim() ?? "";
  } catch { return ""; }
}

const stripe = new Stripe(getEnvVar("STRIPE_SECRET_KEY"));

const PLANS = [
  { setting: "HOME_CARE",       name: "Home Care Agency Compliance",    price: 5999, desc: "WAC 246-335 · $59.99/mo" },
  { setting: "AFH",             name: "Adult Family Home Compliance",    price: 4999, desc: "WAC 388-76 · $49.99/mo" },
  { setting: "ASSISTED_LIVING", name: "Assisted Living Compliance",      price: 6999, desc: "WAC 388-78A · $69.99/mo" },
  { setting: "MULTI_SERVICE",   name: "Multi-Service Agency Compliance", price: 5999, desc: "Multiple WACs · $59.99/mo" },
];

console.log("Creating new Stripe prices...\n");

for (const plan of PLANS) {
  // Find existing product or create new one
  const existing = await stripe.products.search({ query: `name:'${plan.name}'` });
  let productId;

  if (existing.data.length > 0) {
    productId = existing.data[0].id;
    console.log(`Using existing product: ${plan.name} (${productId})`);
  } else {
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.desc,
      metadata: { care_setting: plan.setting },
    });
    productId = product.id;
    console.log(`Created product: ${plan.name} (${productId})`);
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: plan.price,
    currency: "usd",
    recurring: { interval: "month" },
    nickname: `${plan.name} — $${(plan.price / 100).toFixed(2)}/mo`,
    metadata: { care_setting: plan.setting },
  });

  console.log(`  Price: $${(plan.price / 100).toFixed(2)}/mo → ${price.id}`);
}

console.log("\n=== Add these to Vercel Environment Variables ===");
