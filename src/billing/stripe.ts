import Stripe from "stripe";

export function getStripe(env: any) {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });
}
