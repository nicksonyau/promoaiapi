import { jsonResponse } from "../../_lib/utils";
import { Env } from "../../index";

function normalizePhone(p: any) {
  return String(p || "").trim().replace(/\s+/g, "");
}

export async function broadcastGetHandler(req: Request, env: Env, id: string) {
  try {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    if (!id) {
      return jsonResponse({ success: false, error: "Missing id" }, 400);
    }

    const raw = await env.KV.get(`broadcast:${id}`);
    if (!raw) {
      return jsonResponse({ success: false, error: "Not found" }, 404);
    }

    const broadcast = JSON.parse(raw);

    // Recipients are stored as: broadcast_recipient:${id}:${phone}
    const prefix = `broadcast_recipient:${id}:`;
    const recipients: string[] = [];

    let cursor: string | undefined = undefined;
    do {
      const page = await env.KV.list({ prefix, cursor });
      for (const k of page.keys) {
        const phone = k.name.slice(prefix.length);
        if (phone) recipients.push(normalizePhone(phone));
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);

    const deduped = Array.from(new Set(recipients)).filter(Boolean);

    // ✅ Backward compatible: keep broadcast.recipients
    // ✅ Forward friendly: also return recipients + audienceCount top-level
    return jsonResponse({
      success: true,
      broadcast: {
        ...broadcast,
        recipients: deduped,
      },
      recipients: deduped,
      audienceCount: deduped.length,
    });
  } catch (e: any) {
    return jsonResponse(
      { success: false, error: e?.message || "Server error" },
      500
    );
  }
}
