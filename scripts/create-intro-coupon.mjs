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

// Step 1: Create regular prices ($20 more than intro)
const REGULAR_PLANS = [
  { setting: "HOME_CARE",       name: "Home Care Agency Compliance",    price: 7999, desc: "WAC 246-335 · $79.99/mo (regular)" },
  { setting: "AFH",             name: "Adult Family Home Compliance",    price: 6999, desc: "WAC 388-76 · $69.99/mo (regular)" },
  { setting: "ASSISTED_LIVING", name: "Assisted Living Compliance",      price: 8999, desc: "WAC 388-78A · $89.99/mo (regular)" },
  { setting: "MULTI_SERVICE",   name: "Multi-Service Agency Compliance", price: 7999, desc: "Multiple WACs · $79.99/mo (regular)" },
];

console.log("Creating regular (year 2+) prices...\n");

for (const plan of REGULAR_PLANS) {
  const existing = await stripe.products.search({ query: `name:'${plan.name}'` });
  const productId = existing.data[0]?.id;
  if (!productId) { console.log(`Product not found: ${plan.name}`); continue; }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: plan.price,
    currency: "usd",
    recurring: { interval: "month" },
    nickname: `${plan.name} — Regular $${(plan.price / 100).toFixed(2)}/mo`,
    metadata: { care_setting: plan.setting, type: "regular" },
  });
  console.log(`${plan.setting} regular: $${(plan.price / 100).toFixed(2)}/mo → ${price.id}`);
}

// Step 2: Create the $20-off intro coupon (12 months)
console.log("\nCreating $20-off introductory coupon (12 months)...");
const coupon = await stripe.coupons.create({
  id:                  "INTRO_YEAR_1",
  name:                "First Year Introductory Rate",
  amount_off:          2000,  // $20.00 off
  currency:            "usd",
  duration:            "repeating",
  duration_in_months:  12,
  metadata:            { purpose: "first_year_discount" },
});
console.log(`Coupon created: ${coupon.id} — $20 off for 12 months`);

console.log("\n=== ADD TO VERCEL ENV VARS ===");
console.log("STRIPE_COUPON_INTRO_YEAR=INTRO_YEAR_1");
console.log("\nAlso add the regular prices as STRIPE_PRICE_HOME_CARE_REGULAR, etc.");
