import type { PlanId, BillingInterval } from "./plans";

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled";

export type Subscription = {
  plan: PlanId;
  interval: BillingInterval;
  status: SubscriptionStatus;
  source: "auto" | "stripe";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
  createdAt: string;
  updatedAt: string;
};
