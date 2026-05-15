import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "placeholder_for_build");

export type CarePlanId = "HOME_CARE" | "AFH" | "ASSISTED_LIVING" | "MULTI_SERVICE";

export const CARE_SETTING_PLANS: Record<CarePlanId, {
  label: string;
  icon: string;
  color: string;
  wac: string;
  priceId: string;
  price: number;
  features: string[];
}> = {
  HOME_CARE: {
    label:   "Home Care Agency",
    icon:    "🏥",
    color:   "#1d4ed8",
    wac:     "WAC 246-335",
    priceId: process.env.STRIPE_PRICE_HOME_CARE ?? "",
    price:   59.99,
    features: [
      "Home Care compliance dashboard",
      "WAC 246-335 survey checklist (27 items)",
      "Background check & TB assessment tracking",
      "Caregiver clock-in/out with GPS",
      "Visit service reports & ADL tracking",
      "Staff scheduling (day/week view)",
      "Caregiver notes review",
      "Monthly compliance reports",
    ],
  },
  AFH: {
    label:   "Adult Family Home",
    icon:    "🏠",
    color:   "#b45309",
    wac:     "WAC 388-76",
    priceId: process.env.STRIPE_PRICE_AFH ?? "",
    price:   49.99,
    features: [
      "AFH compliance dashboard",
      "WAC 388-76 survey checklist (33 items)",
      "Background check, food handler & CPR tracking",
      "Today's eMAR — medication administration",
      "Controlled substance reconciliation log",
      "Monthly fire drill log",
      "Care plan & resident documentation",
      "Monthly compliance reports",
    ],
  },
  ASSISTED_LIVING: {
    label:   "Assisted Living Facility",
    icon:    "🏢",
    color:   "#6d28d9",
    wac:     "WAC 388-78A",
    priceId: process.env.STRIPE_PRICE_ASSISTED_LIVING ?? "",
    price:   69.99,
    features: [
      "Assisted Living compliance dashboard",
      "WAC 388-78A survey checklist (37 items)",
      "ISP tracking (30-day creation, annual review)",
      "Resident assessment tracker (14-day deadline)",
      "RN delegation log for medication management",
      "Falls incident log with DOH reporting",
      "Staff clock-in/out & notes review",
      "Monthly compliance reports",
    ],
  },
  MULTI_SERVICE: {
    label:   "Multi-Service Agency",
    icon:    "🌐",
    color:   "#0f766e",
    wac:     "Multiple WACs",
    priceId: process.env.STRIPE_PRICE_MULTI_SERVICE ?? "",
    price:   59.99,
    features: [
      "All 4 care setting dashboards",
      "Cross-regulation compliance checklists",
      "Unlimited staff & resident profiles",
      "All clock-in/scheduling features",
      "Medication & incident tracking",
      "Multi-service QIP tracking",
      "Monthly compliance reports",
    ],
  },
};

export const ALL_CARE_PLANS = Object.entries(CARE_SETTING_PLANS).map(([id, plan]) => ({
  id: id as CarePlanId,
  ...plan,
}));
