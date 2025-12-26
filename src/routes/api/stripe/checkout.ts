import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../../_lib/auth";
import type { Env } from "../../../index";

type Interval = "monthly" | "yearly";

function normalizePlanKey(name: any) {
  return String(name || "").trim().toLowerCase();
}

function normalizeInterval(v: any): Interval {
  const x = String(v || "").trim().toLowerCase();
  return x === "yearly" ? "yearly" : "monthly";
}

function requireEnv(env: any, key: string) {
  const v = env?.[key];
  if (!v) throw new Error(`Missing env.${key}`);
  return String(v);
}

function getPriceId(env: any, plan: string, interval: Interval) {
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`;
  return requireEnv(env, key);
}

function buildSuccessUrl(appBaseUrl: string) {
  // Redirect back to your frontend billing page.
  // You can adjust lang if needed; keep consistent for now.
  return `${appBaseUrl}/en/dashboard/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
}

function buildCancelUrl(appBaseUrl: string) {
  return `${appBaseUrl}/en/dashboard/settings/billing?checkout=cancel`;
}

export async function stripeCheckoutHandler(req: Request, env: Env) {
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
    const plan = normalizePlanKey(body?.plan);
    const interval = normalizeInterval(body?.interval);

    if (!plan) {
      return jsonResponse({ success: false, error: "Plan is required" }, 400, req);
    }

    if (!["starter", "growth", "business"].includes(plan)) {
      return jsonResponse({ success: false, error: "Invalid plan" }, 400, req);
    }

    const stripeKey = requireEnv(env, "STRIPE_SECRET_KEY");
    const appBaseUrl = requireEnv(env, "APP_BASE_URL");

    const priceId = getPriceId(env, plan, interval);

    console.log(`[subscription/checkout] creating session trace=${traceId}`, {
      companyId: session.companyId,
      plan,
      interval,
      priceId,
    });

    // Create Checkout Session (subscription mode)
    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("success_url", buildSuccessUrl(appBaseUrl));
    params.set("cancel_url", buildCancelUrl(appBaseUrl));

    // line item
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", "1");

    // metadata for webhook
    params.set("metadata[companyId]", session.companyId);
    params.set("metadata[plan]", plan);
    params.set("metadata[interval]", interval);

    // helpful: also allow promotion codes in future
    // params.set("allow_promotion_codes", "true");

    const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok || !data?.url) {
      console.error(`[subscription/checkout] stripe error trace=${traceId}`, {
        status: resp.status,
        data,
      });
      return jsonResponse(
        { success: false, error: data?.error?.message || "Stripe session create failed" },
        400,
        req
      );
    }

    console.log(`[subscription/checkout] created trace=${traceId}`, {
      id: data.id,
      url: data.url,
    });

    return jsonResponse({ success: true, url: data.url }, 200, req);
  } catch (e: any) {
    console.error(`[subscription/checkout] error trace=${traceId}`, e);
    return jsonResponse(
      { success: false, error: e?.message || "Internal error" },
      500,
      req
    );
  }
}
