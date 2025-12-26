import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";
import type { Env } from "../../index";

type Interval = "monthly" | "yearly";

function normalizePlan(plan: any) {
  return String(plan || "").trim().toLowerCase();
}

function normalizeInterval(interval: any): Interval {
  const v = String(interval || "").trim().toLowerCase();
  return v === "yearly" ? "yearly" : "monthly";
}

function requireEnv(env: any, key: string) {
  const v = env[key];
  if (!v) throw new Error(`Missing env.${key}`);
  return String(v);
}

function priceIdFor(env: any, plan: string, interval: Interval) {
  // ✅ DO NOT GUESS your Stripe price IDs. Put them in env.
  // Example:
  // STRIPE_PRICE_STARTER_MONTHLY=price_...
  // STRIPE_PRICE_STARTER_YEARLY=price_...
  const k = `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`;
  return requireEnv(env, k);
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

    // Optional: prevent checkout for free here (free handled by /subscription/activate)
    if (plan === "free") {
      return jsonResponse({ success: false, error: "Use /subscription/activate for free" }, 400, req);
    }

    const stripeKey = requireEnv(env, "STRIPE_SECRET_KEY");
    const appBaseUrl = requireEnv(env, "APP_BASE_URL"); // e.g. http://localhost:3000
    const priceId = priceIdFor(env, plan, interval);

    
    const successUrl = `${appBaseUrl}/en/dashboard/settings/billing?checkout=success`;
    const cancelUrl = `${appBaseUrl}/en/dashboard/settings/billing?checkout=cancel`;


    // Create Checkout Session (Stripe API)
    const form = new URLSearchParams();
    form.set("mode", "subscription");
    form.set("success_url", successUrl);
    form.set("cancel_url", cancelUrl);

    form.set("client_reference_id", session.companyId);

    // line item
    form.set("line_items[0][price]", priceId);
    form.set("line_items[0][quantity]", "1");

    // metadata (used by webhook to map to plan/interval without guessing)
    form.set("metadata[companyId]", session.companyId);
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

    return jsonResponse({ success: true, url: data.url }, 200, req);
  } catch (e: any) {
    console.error(`[subscription/checkout] error trace=${traceId}`, e);
    return jsonResponse({ success: false, error: e?.message || "Internal error" }, 500, req);
  }
}
