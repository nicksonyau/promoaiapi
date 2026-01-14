import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";
import type { Env } from "../../index";

type Interval = "monthly" | "yearly";

type BillingEvent = {
  id: string;
  ts: string;
  type: "activate" | "checkout_created" | "plan_changed" | string;
  plan?: string;
  interval?: string;
  refId?: string | null;
  note?: string;
};

function normalizePlan(plan: any) {
  return String(plan || "").trim().toLowerCase();
}

function normalizeInterval(interval: any): Interval {
  const v = String(interval || "").trim().toLowerCase();
  return v === "yearly" ? "yearly" : "monthly";
}

function requireEnv(env: any, key: string) {
  const v = env?.[key];
  if (!v) throw new Error(`Missing env.${key}`);
  return String(v);
}

function priceIdFor(env: any, plan: string, interval: Interval) {
  const k = `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`;
  return requireEnv(env, k);
}

async function appendBillingEvent(
  env: Env,
  companyId: string,
  event: Omit<BillingEvent, "id" | "ts">
) {
  const key = `billinglog:${companyId}`;
  const current = (await env.KV.get(key, "json")) as BillingEvent[] | null;
  const list = Array.isArray(current) ? current : [];

  list.unshift({
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    ...event,
  });

  await env.KV.put(key, JSON.stringify(list.slice(0, 50)));
}

export async function subscriptionCheckoutHandler(req: Request, env: Env) {
  const traceId = crypto.randomUUID();

  try {
    console.log(`[subscription/checkout] start trace=${traceId}`);

    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405, req);
    }

    const session = await auth(env, req);
    console.log(`[subscription/checkout] auth trace=${traceId}`, {
      hasSession: !!session,
      companyId: session?.companyId ?? null,
    });

    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401, req);
    }

    const body = await req.json().catch(() => null);
    const plan = normalizePlan(body?.plan);
    const interval = normalizeInterval(body?.interval);

    if (!plan) {
      return jsonResponse({ success: false, error: "Plan is required" }, 400, req);
    }

    if (plan === "free") {
      return jsonResponse(
        { success: false, error: "Use /subscription/activate for free" },
        400,
        req
      );
    }

    const stripeKey = requireEnv(env, "STRIPE_SECRET_KEY");
    const appBaseUrl = requireEnv(env, "APP_BASE_URL"); // e.g. http://localhost:3000
    const priceId = priceIdFor(env, plan, interval);

    const companyId = String(session.companyId);

    const successUrl = `${appBaseUrl}/en/dashboard/settings/billing?checkout=success`;
    const cancelUrl = `${appBaseUrl}/en/pricing?checkout=cancel`;

    const form = new URLSearchParams();
    form.set("mode", "subscription");
    form.set("success_url", successUrl);
    form.set("cancel_url", cancelUrl);

    // ✅ easiest mapping in Stripe Dashboard
    form.set("client_reference_id", companyId);

    // line item
    form.set("line_items[0][price]", priceId);
    form.set("line_items[0][quantity]", "1");

    // ✅ put mapping on SUBSCRIPTION metadata (not only session metadata)
    form.set("subscription_data[metadata][companyId]", companyId);
    form.set("subscription_data[metadata][plan]", plan);
    form.set("subscription_data[metadata][interval]", interval);

    // session metadata (optional)
    form.set("metadata[companyId]", companyId);
    form.set("metadata[plan]", plan);
    form.set("metadata[interval]", interval);

    console.log(`[subscription/checkout] creating session trace=${traceId}`, {
      plan,
      interval,
      priceId,
    });

    const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const data = await resp.json().catch(() => null);

    console.log(`[subscription/checkout] stripe response trace=${traceId}`, {
      ok: resp.ok,
      status: resp.status,
      hasUrl: !!data?.url,
      id: data?.id,
    });

    if (!resp.ok || !data?.url) {
      const msg = data?.error?.message || "Stripe session creation failed";
      return jsonResponse({ success: false, error: msg }, 400, req);
    }

    await appendBillingEvent(env, companyId, {
      type: "checkout_created",
      plan,
      interval,
      refId: data?.id || null,
      note: "Stripe checkout session created",
    });

    return jsonResponse({ success: true, url: data.url }, 200, req);
  } catch (e: any) {
    console.error(`[subscription/checkout] error trace=${traceId}`, e);
    return jsonResponse({ success: false, error: e?.message || "Internal error" }, 500, req);
  }
}
