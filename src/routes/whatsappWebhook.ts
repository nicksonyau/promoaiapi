import { Env } from "../index";

const VERIFY_TOKEN = "test12345678";

export async function whatsappWebhookVerify(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const searchParams = url.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    console.log("[WA_WEBHOOK] ✅ Verification successful");
    return new Response(challenge, { status: 200 });
  }

  console.warn("[WA_WEBHOOK] ❌ Verification failed", {
    mode,
    tokenProvided: Boolean(token),
  });
  return new Response("Forbidden", { status: 403 });
  
}


export async function whatsappWebhookReceive(
  req: Request,
  env: Env
): Promise<Response> {
  let payload: unknown;

  console.log("[WA_WEBHOOK] ✅ whatsappWebhookReceive successful");
  try {
    payload = await req.json();
  } catch (err) {
    // Meta may retry on non-200; invalid JSON still ACK safely
    console.warn("[WA_WEBHOOK] Invalid JSON payload");
    return new Response(null, { status: 200 });
  }

  // ✅ Safe, structured debug logging (NO assumptions)
  console.log("[WA_WEBHOOK] Incoming event", {
    path: new URL(req.url).pathname,
    method: req.method,
    timestamp: new Date().toISOString(),
    payloadPreview: truncatePayload(payload),
  });

  /**
   * IMPORTANT:
   * - Do NOT parse deeply yet
   * - Do NOT block
   * - Do NOT assume schema
   * - Do NOT reply here
   *
   * Future steps:
   * - extract identifiers defensively
   * - async processing
   * - tenant mapping
   */

  return new Response(null, { status: 200 });
}

/**
 * ==============================
 * Helpers
 * ==============================
 */

function truncatePayload(payload: unknown, maxLength = 2000) {
  try {
    const serialized = JSON.stringify(payload);

    if (serialized.length <= maxLength) {
      return payload;
    }

    return {
      truncated: true,
      originalLength: serialized.length,
      preview: serialized.slice(0, maxLength) + "…",
    };
  } catch {
    return { unserializablePayload: true };
  }
}
