import { Env } from "../../../index";
import { jsonResponse } from "../../_lib/utils";
import { requireCompany } from "../../../_lib/auth";

export async function eventTypesListHandler(req: Request, env: Env) {
  try {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await requireCompany(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const companyId = session.companyId;
    const indexKey = `webhook:event-type-index:${companyId}`;
    const prefix = `webhook:event-type:${companyId}:`;

    let ids = (await env.KV.get(indexKey, "json").catch(() => null)) as string[] | null;
    if (!Array.isArray(ids)) ids = [];

    const items: any[] = [];

    // Primary path: index-based read (real-time)
    if (ids.length > 0) {
      for (const id of ids) {
        const key = `${prefix}${id}`;
        const rec = await env.KV.get(key, "json");
        if (rec) items.push(rec);
      }
    } else {
      // Self-heal fallback: only if index missing/empty
      const listed = await env.KV.list({ prefix });
      for (const k of listed.keys) {
        const rec = await env.KV.get(k.name, "json");
        if (rec) items.push(rec);
      }

      // sort + rebuild index so next list is fast & consistent
      items.sort((a: any, b: any) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      const rebuiltIds = items.map((x: any) => x?.id).filter(Boolean);
      await env.KV.put(indexKey, JSON.stringify(rebuiltIds));
    }

    // newest first (stable)
    items.sort((a: any, b: any) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    return new Response(JSON.stringify({ success: true, data: { items } }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e?.message || "Server error" }, 500);
  }
}
