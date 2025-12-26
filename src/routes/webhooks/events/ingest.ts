import { Env } from "../../../index";
import { jsonResponse } from "../../_lib/utils";
import { requireCompany } from "../../../_lib/auth";

type LabelKV = Record<string, string>;

type IngestBody = {
  eventTypeId: string;
  labels?: LabelKV;
  occurredAt?: string;
  payload?: any;
};

type WebhookSubscription = {
  id: string;
  enabled: boolean;
  eventTypeIds: string[];
  labels?: { key: string; value: string }[];
  endpoint: {
    method: string;
    url: string;
    headers?: { name: string; value: string }[];
  };
  signing?: {
    mode?: "none" | "hmac-sha256";
    header?: string;
    secret?: string | null;
  };
  delivery?: {
    retries?: number;
    backoff?: "fixed" | "expo";
    timeoutMs?: number;
    disableAfterFailures?: number;
  };
  lastDelivery?: any;
  failureCount?: number;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function nowIso() {
  return new Date().toISOString();
}

function safeJsonStringify(v: any) {
  try {
    return JSON.stringify(v ?? null);
  } catch {
    return JSON.stringify({ error: "payload_not_serializable" });
  }
}

function labelsMatch(subLabels: { key: string; value: string }[] | undefined, eventLabels: LabelKV) {
  const list = Array.isArray(subLabels) ? subLabels : [];
  for (const l of list) {
    const k = String(l?.key ?? "").trim();
    const v = String(l?.value ?? "").trim();
    if (!k) continue;
    if (!(k in eventLabels)) return false;
    if (v && String(eventLabels[k] ?? "") !== v) return false;
  }
  return true;
}

async function hmacSha256Hex(secret: string, message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function fetchWithTimeout(input: RequestInfo, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function computeBackoffMs(mode: "fixed" | "expo", attemptIndex: number) {
  if (mode === "fixed") return 1000;
  return Math.min(15000, 1000 * Math.pow(2, attemptIndex - 1));
}

async function deliverOne(
  env: Env,
  companyId: string,
  sub: WebhookSubscription,
  event: any,
  rawBody: string
) {
  const deliveryId = crypto.randomUUID();

  const policy = sub.delivery || {};
  const retries = clamp(Number(policy.retries ?? 3), 0, 20);
  const backoff = policy.backoff === "fixed" ? "fixed" : "expo";
  const timeoutMs = clamp(Number(policy.timeoutMs ?? 5000), 1000, 60000);
  const disableAfterFailures = clamp(Number(policy.disableAfterFailures ?? 10), 0, 1000);

  const method = String(sub.endpoint?.method || "POST").toUpperCase();
  const url = String(sub.endpoint?.url || "");
  const headersList = Array.isArray(sub.endpoint?.headers) ? sub.endpoint.headers! : [];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "PromoHubAI-Webhooks/1.0",
    "X-PromoHubAI-Event-Id": String(event.id),
    "X-PromoHubAI-Event-Type": String(event.type),
    "X-PromoHubAI-Delivery-Id": deliveryId,
  };

  for (const h of headersList) {
    const k = String(h?.name ?? "").trim();
    const v = String(h?.value ?? "").trim();
    if (k) headers[k] = v;
  }

  // optional signing
  const signingMode = sub.signing?.mode === "hmac-sha256" ? "hmac-sha256" : "none";
  const signingHeader = String(sub.signing?.header || "X-PromoHubAI-Signature");
  const secret = sub.signing?.secret ? String(sub.signing.secret) : "";

  if (signingMode === "hmac-sha256" && secret) {
    const hex = await hmacSha256Hex(secret, rawBody);
    headers[signingHeader] = `sha256=${hex}`;
  }

  let lastErr: string | null = null;
  let lastStatus: number | null = null;
  let lastLatencyMs: number | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const started = Date.now();
    try {
      const res = await fetchWithTimeout(
        url,
        { method, headers, body: rawBody },
        timeoutMs
      );

      lastStatus = res.status;
      lastLatencyMs = Date.now() - started;
      const ok = res.status >= 200 && res.status < 300;

      await env.KV.put(
        `webhook:attempt:${companyId}:${deliveryId}:${attempt}`,
        safeJsonStringify({
          id: deliveryId,
          attempt,
          subscriptionId: sub.id,
          eventId: event.id,
          at: nowIso(),
          ok,
          status: res.status,
          latencyMs: lastLatencyMs,
        })
      );

      sub.lastDelivery = {
        at: nowIso(),
        ok,
        status: res.status,
        latencyMs: lastLatencyMs,
        error: ok ? null : `HTTP ${res.status}`,
      };

      if (ok) {
        sub.failureCount = 0;
        await env.KV.put(`webhook:subscription:${companyId}:${sub.id}`, safeJsonStringify(sub));
        return;
      }

      lastErr = `HTTP ${res.status}`;

      if (attempt < retries) {
        await sleep(computeBackoffMs(backoff, attempt + 1));
        continue;
      }

      sub.failureCount = (Number(sub.failureCount ?? 0) || 0) + 1;
      if (disableAfterFailures > 0 && sub.failureCount >= disableAfterFailures) {
        sub.enabled = false;
      }
      await env.KV.put(`webhook:subscription:${companyId}:${sub.id}`, safeJsonStringify(sub));
      return;
    } catch (e: any) {
      lastLatencyMs = Date.now() - started;
      lastErr = e?.name === "AbortError" ? "Timeout" : (e?.message || "Fetch error");

      await env.KV.put(
        `webhook:attempt:${companyId}:${deliveryId}:${attempt}`,
        safeJsonStringify({
          id: deliveryId,
          attempt,
          subscriptionId: sub.id,
          eventId: event.id,
          at: nowIso(),
          ok: false,
          status: null,
          latencyMs: lastLatencyMs,
          error: lastErr,
        })
      );

      if (attempt < retries) {
        await sleep(computeBackoffMs(backoff, attempt + 1));
        continue;
      }

      sub.lastDelivery = {
        at: nowIso(),
        ok: false,
        status: null,
        latencyMs: lastLatencyMs,
        error: lastErr,
      };

      sub.failureCount = (Number(sub.failureCount ?? 0) || 0) + 1;
      if (disableAfterFailures > 0 && sub.failureCount >= disableAfterFailures) {
        sub.enabled = false;
      }
      await env.KV.put(`webhook:subscription:${companyId}:${sub.id}`, safeJsonStringify(sub));
      return;
    }
  }
}

export async function webhookEventsIngestHandler(req: Request, env: Env, ctx: ExecutionContext) {
  try {
    const session = await requireCompany(env, req);
    if (!session?.companyId) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    let body: IngestBody;
    try {
      body = (await req.json()) as IngestBody;
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
    }

    const eventTypeId = String(body?.eventTypeId || "").trim();
    if (!eventTypeId) return jsonResponse({ success: false, error: "Missing eventTypeId" }, 400);

    const labels: LabelKV =
      body?.labels && typeof body.labels === "object" ? (body.labels as any) : {};

    const eventId = `evt_${crypto.randomUUID()}`;
    const receivedAt = nowIso();

    const event = {
      id: eventId,
      type: eventTypeId,
      occurredAt: body?.occurredAt ? String(body.occurredAt) : receivedAt,
      receivedAt,
      labels,
      payload: body?.payload ?? null,
    };

    const companyId = session.companyId;

    // save event
    await env.KV.put(`webhook:event:${companyId}:${eventId}`, safeJsonStringify(event));

    // index (latest 200)
    const indexKey = `webhook:event-index:${companyId}`;
    const prev = (await env.KV.get(indexKey, "json").catch(() => null)) as any;
    const arr: string[] = Array.isArray(prev) ? prev : [];
    arr.unshift(eventId);
    await env.KV.put(indexKey, safeJsonStringify(arr.slice(0, 200)));

    // find matching subs
    const subIndexKey = `webhook:subscription-index:${companyId}`;
    const subIdsAny = (await env.KV.get(subIndexKey, "json").catch(() => null)) as any;
    const subIds: string[] = Array.isArray(subIdsAny) ? subIdsAny.map((x) => String(x)) : [];

    const subs: WebhookSubscription[] = [];
    for (const id of subIds) {
      const s = (await env.KV.get(`webhook:subscription:${companyId}:${id}`, "json").catch(() => null)) as any;
      if (s && s.id) subs.push(s as WebhookSubscription);
    }

    const matched = subs.filter((s) => {
      if (!s || s.enabled === false) return false;
      const et = Array.isArray(s.eventTypeIds) ? s.eventTypeIds : [];
      if (!et.includes(eventTypeId)) return false;
      if (!labelsMatch(s.labels, labels)) return false;
      const url = String(s.endpoint?.url || "");
      return url.startsWith("https://") || url.startsWith("http://");
    });

    const rawBody = safeJsonStringify(event);

    // deliver async
    ctx.waitUntil(
      (async () => {
        await Promise.allSettled(
          matched.map((s) => deliverOne(env, companyId, s, event, rawBody))
        );
      })()
    );

    return jsonResponse({
      success: true,
      data: {
        eventId,
        receivedAt,
        matchedSubscriptions: matched.length,
        deliveriesQueued: matched.length,
      },
    });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e?.message || "Server error" }, 500);
  }
}
