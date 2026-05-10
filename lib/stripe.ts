import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    priceId: process.env.STRIPE_PRICE_STARTER ?? "",
    description: "Perfect for a single home care or AFH operation",
    features: [
      "1 care setting dashboard",
      "Up to 10 staff profiles",
      "Document tracking & expiry alerts",
      "Email notifications",
      "Staff application form",
    ],
    highlight: false,
  },
  {
    id: "professional",
    name: "Professional",
    price: 149,
    priceId: process.env.STRIPE_PRICE_PROFESSIONAL ?? "",
    description: "Full access for growing agencies",
    features: [
      "All 4 care setting dashboards",
      "Unlimited staff profiles",
      "Resident compliance tracking",
      "Priority alert system",
      "Compliance checklists",
      "Document upload & storage",
    ],
    highlight: true,
  },
  {
    id: "agency",
    name: "Agency",
    price: 299,
    priceId: process.env.STRIPE_PRICE_AGENCY ?? "",
    description: "Multi-facility support for large agencies",
    features: [
      "Everything in Professional",
      "Multi-facility management",
      "Custom branding",
      "API access",
      "Priority support",
      "Audit log exports",
    ],
    highlight: false,
  },
] as const;

export type PlanId = (typeof PLANS)[number]["id"];
