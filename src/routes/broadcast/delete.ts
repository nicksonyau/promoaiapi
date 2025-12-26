import { jsonResponse } from "../../_lib/utils";
import { Env } from "../../index";

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

export async function broadcastDeleteHandler(req: Request, env: Env) {
  const reqId = crypto.randomUUID();

  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const body = await req.json().catch(() => null);
    if (!body?.id) {
      return jsonResponse({ success: false, error: "Missing id" }, 400);
    }

    const id = String(body.id);
    const broadcastKey = `broadcast:${id}`;

    console.log(`[broadcast:delete:${reqId}] id=`, id);

    // 1) delete broadcast record
    await env.KV.delete(broadcastKey);
    console.log(`[broadcast:delete:${reqId}] KV.delete ${broadcastKey}`);

    // 2) delete recipients
    const prefix = `broadcast_recipient:${id}:`;
    const keys = await listAllKeys(env, prefix);

    console.log(
      `[broadcast:delete:${reqId}] recipients keys found=`,
      keys.length
    );

    // bulk delete
    await Promise.all(keys.map((k) => env.KV.delete(k)));

    console.log(`[broadcast:delete:${reqId}] DONE`);

    return jsonResponse({
      success: true,
      id,
      deletedRecipients: keys.length,
    });
  } catch (e: any) {
    console.log(`[broadcast:delete:${reqId}] ERROR`, e?.message || e);
    return jsonResponse(
      { success: false, error: e?.message || "Server error" },
      500
    );
  }
}
