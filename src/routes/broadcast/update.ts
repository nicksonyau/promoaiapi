import { jsonResponse } from "../../_lib/utils";
import { Env } from "../../index";

function normalizePhone(p: any) {
  return String(p || "").trim().replace(/\s+/g, "");
}

function safeJson(v: any) {
  try {
    return JSON.stringify(v);
  } catch {
    return '"[unserializable]"';
  }
}

function truncate(s: string, n = 1200) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n) + `…(truncated, len=${s.length})` : s;
}

// ✅ Accept either { channel: {...} } OR { channelId, channelLabel }
function normalizeChannel(body: any) {
  if (body?.channel && typeof body.channel === "object") return body.channel;
  if (body?.channelId) {
    return {
      id: String(body.channelId),
      label: String(body.channelLabel || body.channelId),
    };
  }
  return null;
}

async function listAllKeys(env: Env, prefix: string) {
  const out: string[] = [];
  let cursor: string | undefined = undefined;

  while (true) {
    const res = await env.KV.list({ prefix, cursor });
    for (const k of res.keys) out.push(k.name);
    if (!res.list_complete) cursor = res.cursor;
    else break;
  }
  return out;
}

export async function broadcastUpdateHandler(req: Request, env: Env, id: string) {
  const reqId = crypto.randomUUID();

  try {
    if (!id) {
      console.log(`[broadcast:update:${reqId}] Missing id`);
      return jsonResponse({ success: false, error: "Missing id" }, 400);
    }

    const existingRaw = await env.KV.get(`broadcast:${id}`);
    if (!existingRaw) {
      console.log(`[broadcast:update:${reqId}] Not found broadcast:${id}`);
      return jsonResponse({ success: false, error: "Not found" }, 404);
    }

    const existing = JSON.parse(existingRaw);

    const body = await req.json().catch(() => null);
    if (!body) {
      console.log(`[broadcast:update:${reqId}] Invalid JSON body`);
      return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
    }

    // ✅ log raw body
    console.log(
      `[broadcast:update:${reqId}] body(raw) =`,
      truncate(safeJson(body), 2200)
    );

    const nextRecipients = Array.isArray(body.recipients)
      ? body.recipients.map(normalizePhone).filter(Boolean)
      : [];

    console.log(
      `[broadcast:update:${reqId}] recipients(raw) len=`,
      Array.isArray(body.recipients) ? body.recipients.length : 0
    );
    console.log(
      `[broadcast:update:${reqId}] recipients(normalized) len=`,
      nextRecipients.length
    );
    console.log(
      `[broadcast:update:${reqId}] recipients(sample)=`,
      nextRecipients.slice(0, 10)
    );

    if (nextRecipients.length === 0) {
      console.log(`[broadcast:update:${reqId}] ERROR: No recipients`);
      return jsonResponse({ success: false, error: "No recipients" }, 400);
    }

    const now = Date.now();

    // ✅ channel persistence + log
    const channel = normalizeChannel(body);
    console.log(`[broadcast:update:${reqId}] channel =`, channel);

    const updated = {
      ...existing,
      name: body.name ?? existing.name,

      // ✅ Persist channel fields (keep existing if not provided)
      channel: channel ?? existing.channel ?? null,
      channelId: channel?.id ?? body.channelId ?? existing.channelId ?? null,
      channelLabel:
        channel?.label ?? body.channelLabel ?? existing.channelLabel ?? null,

      templates: body.templates ?? existing.templates,
      message: body.message ?? existing.message,
      attachments: body.attachments ?? existing.attachments,
      settings: body.settings ?? existing.settings,
      scheduledAt: body.scheduleAt ?? existing.scheduledAt ?? null,
      totalRecipients: nextRecipients.length,
      updatedAt: now,
    };

    const updatedStr = JSON.stringify(updated);
    console.log(`[broadcast:update:${reqId}] KV.put broadcast:${id}`);
    console.log(
      `[broadcast:update:${reqId}] updatedStr =`,
      truncate(updatedStr, 2200)
    );

    await env.KV.put(`broadcast:${id}`, updatedStr);

    // ---- DIFF RECIPIENTS ----
    const prefix = `broadcast_recipient:${id}:`;
    const existingKeys = await listAllKeys(env, prefix);

    const existingPhones = new Set(
      existingKeys
        .map((k) => k.slice(prefix.length))
        .map(normalizePhone)
        .filter(Boolean)
    );

    const nextSet = new Set(nextRecipients);

    let removed = 0;
    let added = 0;

    // delete removed
    for (const phone of existingPhones) {
      if (!nextSet.has(phone)) {
        await env.KV.delete(`${prefix}${phone}`);
        removed++;
      }
    }

    // add new
    for (const phone of nextSet) {
      if (!existingPhones.has(phone)) {
        await env.KV.put(
          `${prefix}${phone}`,
          JSON.stringify({
            phone,
            status: "pending",
            createdAt: now,
          })
        );
        added++;
      }
    }

    console.log(
      `[broadcast:update:${reqId}] recipients diff: existing=${existingPhones.size} next=${nextSet.size} added=${added} removed=${removed}`
    );

    return jsonResponse({ success: true, id });
  } catch (e: any) {
    console.log(`[broadcast:update:${reqId}] ERROR`, e?.message || e);
    return jsonResponse(
      { success: false, error: e?.message || "Server error" },
      500
    );
  }
}
