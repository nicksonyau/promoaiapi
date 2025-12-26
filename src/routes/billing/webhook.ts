import { getStripe } from "../../billing/stripe";
import { saveSubscription } from "../../billing/subscription";

export async function billingWebhook(req: Request, env: any) {
  const stripe = getStripe(env);
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();

  const event = stripe.webhooks.constructEvent(
    body,
    sig,
    env.STRIPE_WEBHOOK_SECRET
  );

  if (event.type === "checkout.session.completed") {
    const session: any = event.data.object;
    const companyId = session.metadata.companyId;

    await saveSubscription(env, companyId, {
      plan: "pro", // resolved by price mapping later
      interval: "month",
      status: "active",
      source: "stripe",
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return new Response("ok");
}
