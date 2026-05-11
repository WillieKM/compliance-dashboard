import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "placeholder_for_build");

export type CarePlanId = "HOME_CARE" | "AFH" | "ASSISTED_LIVING" | "MULTI_SERVICE";
export type TierId = "starter" | "pro";

export const CARE_SETTING_PLANS: Record<CarePlanId, {
  label: string;
  icon: string;
  color: string;
  wac: string;
  starter: { priceId: string; price: number; features: string[] };
  pro:     { priceId: string; price: number; features: string[] };
}> = {
  HOME_CARE: {
    label: "Home Care Agency",
    icon: "🏥",
    color: "#1d4ed8",
    wac: "WAC 246-335",
    starter: {
      priceId: process.env.STRIPE_PRICE_HOME_CARE_STARTER ?? "",
      price: 49,
      features: ["Home Care compliance dashboard", "Up to 10 staff profiles", "WAC 246-335 survey checklist", "Background check & TB tracking", "Basic alerts"],
    },
    pro: {
      priceId: process.env.STRIPE_PRICE_HOME_CARE_PRO ?? "",
      price: 89,
      features: ["Everything in Starter", "Unlimited staff", "Caregiver clock-in/out with GPS", "Visit service reports & ADL tracking", "AI care plan generation", "Monthly compliance reports emailed"],
    },
  },
  AFH: {
    label: "Adult Family Home",
    icon: "🏠",
    color: "#b45309",
    wac: "WAC 388-76",
    starter: {
      priceId: process.env.STRIPE_PRICE_AFH_STARTER ?? "",
      price: 49,
      features: ["AFH compliance dashboard", "Up to 10 staff profiles", "WAC 388-76 survey checklist (33 items)", "Background check & food handler tracking", "Basic alerts"],
    },
    pro: {
      priceId: process.env.STRIPE_PRICE_AFH_PRO ?? "",
      price: 89,
      features: ["Everything in Starter", "Unlimited staff", "Medication management tracking", "Resident care plan & MAR tracking", "AI AFH assessment → care plan", "Monthly compliance reports"],
    },
  },
  ASSISTED_LIVING: {
    label: "Assisted Living Facility",
    icon: "🏢",
    color: "#6d28d9",
    wac: "WAC 388-78A",
    starter: {
      priceId: process.env.STRIPE_PRICE_AL_STARTER ?? "",
      price: 49,
      features: ["Assisted Living compliance dashboard", "Up to 10 staff profiles", "WAC 388-78A survey checklist (37 items)", "Administrator license tracking", "Basic alerts"],
    },
    pro: {
      priceId: process.env.STRIPE_PRICE_AL_PRO ?? "",
      price: 89,
      features: ["Everything in Starter", "Unlimited staff", "ISP & resident assessment tracking", "RN delegation & medication management", "Activities program tracking", "Monthly compliance reports"],
    },
  },
  MULTI_SERVICE: {
    label: "Multi-Service Agency",
    icon: "🌐",
    color: "#0f766e",
    wac: "Multiple WACs",
    starter: {
      priceId: process.env.STRIPE_PRICE_MS_STARTER ?? "",
      price: 49,
      features: ["Multi-service compliance dashboard", "Up to 10 staff profiles", "Cross-regulation checklist", "All care setting compliance tracking", "Basic alerts"],
    },
    pro: {
      priceId: process.env.STRIPE_PRICE_MS_PRO ?? "",
      price: 89,
      features: ["Everything in Starter", "Unlimited staff", "All 4 care setting dashboards", "Caregiver clock-in/out", "AI care plan generation", "Monthly reports for all services"],
    },
  },
};

export const ALL_CARE_PLANS = Object.entries(CARE_SETTING_PLANS).map(([id, plan]) => ({
  id: id as CarePlanId,
  ...plan,
}));
