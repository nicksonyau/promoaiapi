import { Env } from "../../../index";
import { jsonResponse } from "../../_lib/utils";
import { requireCompany } from "../../../_lib/auth";

export async function eventTypesCreateHandler(req: Request, env: Env) {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await requireCompany(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => null);
    const name = String(body?.name || "").trim();
    if (!name) {
      return jsonResponse({ success: false, error: "Missing event name" }, 400);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const record = {
      id,
      companyId: session.companyId,
      name,
      description: String(body?.description || "").trim(),
      createdAt: now,
      updatedAt: now,
    };

    const key = `webhook:event-type:${session.companyId}:${id}`;
    const indexKey = `webhook:event-type-index:${session.companyId}`;

    // 1) write record
    await env.KV.put(key, JSON.stringify(record));

    // 2) update index (avoids KV.list() lag)
    const existing = (await env.KV.get(indexKey, "json").catch(() => null)) as string[] | null;
    const ids = Array.isArray(existing) ? existing : [];
    if (!ids.includes(id)) ids.unshift(id);
    await env.KV.put(indexKey, JSON.stringify(ids));

    return new Response(JSON.stringify({ success: true, data: record }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e?.message || "Server error" }, 500);
  }
}
