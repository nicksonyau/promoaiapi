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

function truncate(s: string, n = 800) {
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

export async function broadcastCreateHandler(req: Request, env: Env) {
  const reqId = crypto.randomUUID();
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      console.log(`[broadcast:create:${reqId}] Invalid JSON body`);
      return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
    }

    console.log(
      `[broadcast:create:${reqId}] body(raw) =`,
      truncate(safeJson(body), 2000)
    );

    const recipients = Array.isArray(body.recipients)
      ? body.recipients.map(normalizePhone).filter(Boolean)
      : [];

    console.log(
      `[broadcast:create:${reqId}] recipients(raw) len=`,
      Array.isArray(body.recipients) ? body.recipients.length : 0
    );
    console.log(
      `[broadcast:create:${reqId}] recipients(normalized) len=`,
      recipients.length
    );
    console.log(
      `[broadcast:create:${reqId}] recipients(sample) =`,
      recipients.slice(0, 10)
    );

    if (recipients.length === 0) {
      console.log(
        `[broadcast:create:${reqId}] ERROR: No recipients after normalization`
      );
      return jsonResponse({ success: false, error: "No recipients" }, 400);
    }

    // ✅ NEW: channel persistence
    const channel = normalizeChannel(body);
    console.log(`[broadcast:create:${reqId}] channel =`, channel);

    const id = crypto.randomUUID();
    const now = Date.now();

    const broadcast = {
      id,
      companyId: body.companyId ?? null, // inject later via auth
      name: body.name || "Untitled broadcast",

      // ✅ Persist channel
      channel, // object or null
      channelId: channel?.id ?? body.channelId ?? null,
      channelLabel: channel?.label ?? body.channelLabel ?? null,

      templates: body.templates ?? [],
      message: body.message ?? "",
      attachments: body.attachments ?? [],
      settings: body.settings ?? {},
      status: "draft",
      createdAt: now,
      scheduledAt: body.scheduleAt ?? null,
      totalRecipients: recipients.length,
      sent: 0,
      failed: 0,
    };

    const broadcastKey = `broadcast:${id}`;
    const broadcastStr = JSON.stringify(broadcast);

    console.log(`[broadcast:create:${reqId}] KV.put ${broadcastKey}`);
    console.log(
      `[broadcast:create:${reqId}] broadcastStr =`,
      truncate(broadcastStr, 2000)
    );

    await env.KV.put(broadcastKey, broadcastStr);

    let wroteRecipients = 0;
    for (const phone of recipients) {
      const k = `broadcast_recipient:${id}:${phone}`;
      const vObj = { phone, status: "pending", createdAt: now };
      const vStr = JSON.stringify(vObj);

      if (wroteRecipients < 5) {
        console.log(`[broadcast:create:${reqId}] KV.put ${k} =`, vStr);
      }

      await env.KV.put(k, vStr);
      wroteRecipients++;
    }

    console.log(
      `[broadcast:create:${reqId}] DONE. wroteRecipients=`,
      wroteRecipients
    );

    let proof: any = undefined;
    if (debug) {
      const saved = await env.KV.get(broadcastKey);
      proof = {
        broadcastKey,
        savedLen: saved ? saved.length : 0,
        recipientsCount: wroteRecipients,
        recipientsSample: recipients.slice(0, 10),
        channel,
      };
      console.log(`[broadcast:create:${reqId}] proof=`, proof);
    }

    return jsonResponse(debug ? { success: true, id, debug: proof } : { success: true, id });
  } catch (e: any) {
    console.log(`[broadcast:create:${reqId}] ERROR`, e?.message || e);
    return jsonResponse(
      { success: false, error: e?.message || "Server error" },
      500
    );
  }
}
