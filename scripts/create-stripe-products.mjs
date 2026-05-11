import Stripe from "stripe";
import { readFileSync } from "fs";

// Read key from .env.local
function getEnvVar(name) {
  try {
    const env = readFileSync(".env.local", "utf8");
    const match = env.match(new RegExp(`^${name}=(.+)$`, "m"));
    return match?.[1]?.trim() ?? "";
  } catch { return ""; }
}

const stripe = new Stripe(getEnvVar("STRIPE_SECRET_KEY"));

const SETTINGS = [
  { id: "HOME_CARE",       name: "Home Care Agency Compliance",    desc: "WAC 246-335 · Medicare/Medicaid home health compliance" },
  { id: "AFH",             name: "Adult Family Home Compliance",    desc: "WAC 388-76 · State-licensed residential care compliance" },
  { id: "ASSISTED_LIVING", name: "Assisted Living Compliance",      desc: "WAC 388-78A · Licensed facility compliance" },
  { id: "MULTI_SERVICE",   name: "Multi-Service Agency Compliance", desc: "Multiple WACs · Cross-regulation compliance tracking" },
];

const TIERS = [
  { tier: "starter", price: 4900, label: "Starter", features: ["1 compliance dashboard", "Up to 10 staff", "Survey readiness checklist", "Basic alerts"] },
  { tier: "pro",     price: 8900, label: "Professional", features: ["Full compliance suite", "Unlimited staff", "Caregiver clock-in/out", "AI care plans", "Monthly reports"] },
];

console.log("Creating Stripe products and prices...\n");

const results = {};

for (const setting of SETTINGS) {
  console.log(`Creating: ${setting.name}`);

  const product = await stripe.products.create({
    name: setting.name,
    description: setting.desc,
    metadata: { care_setting: setting.id },
  });

  results[setting.id] = { productId: product.id, prices: {} };

  for (const tier of TIERS) {
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: tier.price,
      currency: "usd",
      recurring: { interval: "month" },
      nickname: `${setting.name} - ${tier.label}`,
      metadata: { care_setting: setting.id, tier: tier.tier },
    });

    results[setting.id].prices[tier.tier] = price.id;
    console.log(`  ${tier.label} ($${tier.price / 100}/mo): ${price.id}`);
  }
  console.log("");
}

console.log("=== ENV VARIABLES TO COPY ===\n");
console.log(`STRIPE_PRICE_HOME_CARE_STARTER=${results.HOME_CARE.prices.starter}`);
console.log(`STRIPE_PRICE_HOME_CARE_PRO=${results.HOME_CARE.prices.pro}`);
console.log(`STRIPE_PRICE_AFH_STARTER=${results.AFH.prices.starter}`);
console.log(`STRIPE_PRICE_AFH_PRO=${results.AFH.prices.pro}`);
console.log(`STRIPE_PRICE_AL_STARTER=${results.ASSISTED_LIVING.prices.starter}`);
console.log(`STRIPE_PRICE_AL_PRO=${results.ASSISTED_LIVING.prices.pro}`);
console.log(`STRIPE_PRICE_MS_STARTER=${results.MULTI_SERVICE.prices.starter}`);
console.log(`STRIPE_PRICE_MS_PRO=${results.MULTI_SERVICE.prices.pro}`);
