import { getStripe } from "../../billing/stripe";
import { PLANS } from "../../billing/plans";

export async function billingCheckout(
  req: Request,
  env: any,
  session: any
) {
  const { plan, interval } = await req.json();
  const price = PLANS[plan]?.prices?.[interval];

  if (!price) {
    return new Response("Invalid plan", { status: 400 });
  }

  const stripe = getStripe(env);

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: price.stripePriceId, quantity: 1 }],
    success_url: `${env.APP_URL}/dashboard/billing?success=1`,
    cancel_url: `${env.APP_URL}/dashboard/billing?cancel=1`,
    metadata: { companyId: session.companyId },
  });

  return new Response(JSON.stringify({ url: checkout.url }), {
    headers: { "Content-Type": "application/json" },
  });
}
