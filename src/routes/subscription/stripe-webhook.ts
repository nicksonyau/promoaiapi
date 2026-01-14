import { jsonResponse } from "../../_lib/utils";
import type { Env } from "../../index";

/**
 * Plan limits used to build KV subscription object.
 * Must include paid plans you sell.
 */
const PLAN_DEFINITION: Record<string, any> = {
  free: { interval: "monthly", messageLimitPerDay: 10, campaignLimitPerMonth: 3, aiReplies: 50, storageMb: 100 },
  starter: { interval: "monthly", messageLimitPerDay: 50, campaignLimitPerMonth: 10, aiReplies: 300, storageMb: 5120 },
  growth: { interval: "monthly", messageLimitPerDay: 100, campaignLimitPerMonth: 30, aiReplies: 1000, storageMb: 10240 },
  business: { interval: "monthly", messageLimitPerDay: 500, campaignLimitPerMonth: 50, aiReplies: 5000, storageMb: 30720 },
};

type BillingEvent = {
  id: string;
  ts: string;
  type: "activate" | "checkout_created" | "plan_changed" | string;
  plan?: string;
  interval?: string;
  refId?: string | null;
  note?: string;
};

function requireEnv(env: any, key: string) {
  const v = env?.[key];
  if (!v) throw new Error(`Missing env.${key}`);
  return String(v);
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

function toHex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSHA256Hex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toHex(sig);
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/**
 * Stripe-Signature: t=...,v1=...
 */
async function verifyStripeSignature(req: Request, rawBody: string, webhookSecret: string) {
  const sig = req.headers.get("stripe-signature") || "";
  const parts = sig.split(",").map((s) => s.trim());
  const t = parts.find((p) => p.startsWith("t="))?.slice(2);
  const v1s = parts.filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));

  if (!t || v1s.length === 0) return false;

  const signedPayload = `${t}.${rawBody}`;
  const expected = await hmacSHA256Hex(webhookSecret, signedPayload);

  return v1s.some((v1) => timingSafeEqual(v1, expected));
}

async function stripeGet(url: string, secretKey: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const data = await res.json().catch(() => null);
  return { res, data };
}

function isoFromUnix(sec?: number) {
  if (typeof sec !== "number") return null;
  return new Date(sec * 1000).toISOString();
}

export async function stripeWebhookHandler(req: Request, env: Env) {
  const traceId = crypto.randomUUID();

  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405, req);
    }

    const webhookSecret = requireEnv(env, "STRIPE_WEBHOOK_SECRET");
    const stripeKey = requireEnv(env, "STRIPE_SECRET_KEY");

    const rawBody = await req.text();
    const okSig = await verifyStripeSignature(req, rawBody, webhookSecret);

    if (!okSig) {
      console.warn(`[stripe/webhook] bad signature trace=${traceId}`);
      return jsonResponse({ success: false, error: "Bad signature" }, 400, req);
    }

    const event = JSON.parse(rawBody);
    const type = String(event?.type || "");

    console.log(`[stripe/webhook] event trace=${traceId}`, { type });

    // ✅ Most important: subscription activation after payment
    // We rely on subscription metadata set in /subscription/checkout (subscription_data[metadata])
    if (type === "checkout.session.completed") {
      // session contains subscription + customer, but period dates are in subscription object
      const session = event?.data?.object;
      const subscriptionId = session?.subscription;
      const customerId = session?.customer;

      if (!subscriptionId) {
        return jsonResponse({ success: true, received: true }, 200, req);
      }

      const { res: subRes, data: sub } = await stripeGet(
        `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
        stripeKey
      );

      if (!subRes.ok) {
        console.error(`[stripe/webhook] fetch subscription failed trace=${traceId}`, sub);
        return jsonResponse({ success: false, error: "Failed to fetch subscription" }, 500, req);
      }

      const companyId = String(sub?.metadata?.companyId || "");
      const plan = String(sub?.metadata?.plan || "").toLowerCase();
      const interval = String(sub?.metadata?.interval || "").toLowerCase() || "monthly";

      if (!companyId || !plan) {
        console.error(`[stripe/webhook] missing metadata trace=${traceId}`, {
          companyId,
          plan,
        });
        return jsonResponse({ success: true, received: true }, 200, req);
      }

      const planDef = PLAN_DEFINITION[plan] || PLAN_DEFINITION["starter"];

      const startDate = isoFromUnix(sub?.current_period_start) || new Date().toISOString();
      const endDate = isoFromUnix(sub?.current_period_end);

      const priceId =
        sub?.items?.data?.[0]?.price?.id ||
        null;

      const status = String(sub?.status || "active");

      const kvKey = `subscription:${companyId}`;
      const subscriptionObj = {
        companyId,
        plan,
        interval,
        status,

        startDate,
        endDate,

        limits: {
          messageLimitPerDay: planDef.messageLimitPerDay,
          campaignLimitPerMonth: planDef.campaignLimitPerMonth,
          aiReplies: planDef.aiReplies,
          storageMb: planDef.storageMb,
        },

        source: "stripe",
        stripe: {
          customerId: customerId ? String(customerId) : undefined,
          subscriptionId: subscriptionId ? String(subscriptionId) : undefined,
          priceId: priceId ? String(priceId) : undefined,
        },

        updatedAt: new Date().toISOString(),
      };

      // Preserve createdAt if exists
      const existing = await env.KV.get(kvKey, "json");
      if (existing?.createdAt) subscriptionObj["createdAt"] = existing.createdAt;
      else subscriptionObj["createdAt"] = new Date().toISOString();

      await env.KV.put(kvKey, JSON.stringify(subscriptionObj));

      await appendBillingEvent(env, companyId, {
        type: "activate",
        plan,
        interval,
        refId: String(subscriptionId || ""),
        note: "Stripe checkout completed",
      });

      return jsonResponse({ success: true, received: true }, 200, req);
    }

    // Optional: keep KV in sync if subscription changes/cancels
    if (type === "customer.subscription.updated" || type === "customer.subscription.deleted") {
      const sub = event?.data?.object;
      const subscriptionId = sub?.id;
      const companyId = String(sub?.metadata?.companyId || "");
      const plan = String(sub?.metadata?.plan || "").toLowerCase();
      const interval = String(sub?.metadata?.interval || "").toLowerCase() || "monthly";

      if (companyId) {
        const kvKey = `subscription:${companyId}`;
        const existing = await env.KV.get(kvKey, "json");

        if (existing) {
          existing.status = String(sub?.status || existing.status || "active");
          existing.startDate = isoFromUnix(sub?.current_period_start) || existing.startDate;
          existing.endDate = isoFromUnix(sub?.current_period_end) || existing.endDate;
          existing.interval = interval || existing.interval;
          if (plan) existing.plan = plan;

          existing.stripe = existing.stripe || {};
          existing.stripe.subscriptionId = subscriptionId ? String(subscriptionId) : existing.stripe.subscriptionId;
          existing.updatedAt = new Date().toISOString();

          await env.KV.put(kvKey, JSON.stringify(existing));

          await appendBillingEvent(env, companyId, {
            type: "plan_changed",
            plan: existing.plan,
            interval: existing.interval,
            refId: subscriptionId ? String(subscriptionId) : null,
            note: `Stripe subscription ${type === "customer.subscription.deleted" ? "deleted" : "updated"}`,
          });
        }
      }

      return jsonResponse({ success: true, received: true }, 200, req);
    }

    // Other events: just acknowledge
    return jsonResponse({ success: true, received: true }, 200, req);
  } catch (e: any) {
    console.error(`[stripe/webhook] error trace=${traceId}`, e);
    return jsonResponse({ success: false, error: e?.message || "Internal error" }, 500, req);
  }
}
