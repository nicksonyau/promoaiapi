export type PlanId = "free" | "starter" | "pro" | "business";
export type BillingInterval = "month" | "year";

export type PlanConfig = {
  label: string;
  prices?: Partial<Record<BillingInterval, {
    amount: number;
    stripePriceId: string;
  }>>;
  limits: {
    messagesPerDay: number;
    campaignsPerMonth: number;
    storageMb?: number;
  };
};

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    label: "Free",
    limits: {
      messagesPerDay: 10,
      campaignsPerMonth: 1,
      storageMb: 100,
    },
  },

  starter: {
    label: "Starter",
    prices: {
      month: { amount: 10, stripePriceId: "price_starter_month" },
      year: { amount: 99, stripePriceId: "price_starter_year" },
    },
    limits: {
      messagesPerDay: 300,
      campaignsPerMonth: 10,
      storageMb: 5120,
    },
  },

  pro: {
    label: "Pro",
    prices: {
      month: { amount: 29, stripePriceId: "price_pro_month" },
      year: { amount: 290, stripePriceId: "price_pro_year" },
    },
    limits: {
      messagesPerDay: 500,
      campaignsPerMonth: 30,
      storageMb: 10240,
    },
  },

  business: {
    label: "Business",
    prices: {
      month: { amount: 59, stripePriceId: "price_business_month" },
      year: { amount: 590, stripePriceId: "price_business_year" },
    },
    limits: {
      messagesPerDay: 1000,
      campaignsPerMonth: 50,
      storageMb: 20480,
    },
  },
};
