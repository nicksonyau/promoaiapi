import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";
import type { Env } from "../../index";
import Stripe from "stripe";

export async function subscriptionStripeSuccessHandler(req: Request, env: Env) {
  const session = await auth(env, req);
  if (!session?.companyId) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) {
    return jsonResponse({ success: false, error: "Missing session_id" }, 400);
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });

  const checkout = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items"],
  });

  if (checkout.payment_status !== "paid") {
    return jsonResponse({ success: false, error: "Payment not completed" }, 400);
  }

  const plan = checkout.metadata?.plan;
  const interval = checkout.metadata?.interval ?? "monthly";

  if (!plan) {
    return jsonResponse({ success: false, error: "Plan missing in metadata" }, 400);
  }

  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + 1);

  const subscription = {
    companyId: session.companyId,
    plan,
    interval,
    status: "active",
    startDate: now.toISOString(),
    endDate: end.toISOString(),
    source: "stripe",
    createdAt: now.toISOString(),
  };

  await env.KV.put(
    `subscription:${session.companyId}`,
    JSON.stringify(subscription)
  );

  // append billing log
  const billingKey = `billinglog:${session.companyId}`;
  const current = (await env.KV.get(billingKey, "json")) as any[] | null;
  const list = Array.isArray(current) ? current : [];

  list.unshift({
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    type: "activate",
    plan,
    interval,
    refId: sessionId,
    note: "Stripe payment confirmed",
  });

  await env.KV.put(billingKey, JSON.stringify(list.slice(0, 50)));

  return Response.redirect(
    `${env.APP_URL}/en/dashboard/settings/billing`,
    302
  );
}
