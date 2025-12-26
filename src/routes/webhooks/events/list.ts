import { Env } from "../../../index";
import { jsonResponse } from "../../_lib/utils";
import { requireCompany } from "../../../_lib/auth";

export async function webhookEventsListHandler(req: Request, env: Env) {
  try {
    const session = await requireCompany(env, req);
    if (!session?.companyId) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") || 50)));
    const cursor = url.searchParams.get("cursor");

    const indexKey = `webhook:event-index:${session.companyId}`;
    const index = (await env.KV.get(indexKey, "json").catch(() => null)) as any;
    const ids: string[] = Array.isArray(index) ? index.map((x) => String(x)) : [];

    // very simple cursor: cursor is an eventId; start after it
    let start = 0;
    if (cursor) {
      const i = ids.indexOf(cursor);
      start = i >= 0 ? i + 1 : 0;
    }

    const pageIds = ids.slice(start, start + limit);

    const items: any[] = [];
    for (const id of pageIds) {
      const ev = (await env.KV.get(`webhook:event:${session.companyId}:${id}`, "json").catch(() => null)) as any;
      if (ev) items.push(ev);
    }

    const nextCursor = (start + limit) < ids.length ? pageIds[pageIds.length - 1] : null;

    return jsonResponse({
      success: true,
      data: { items, cursor: nextCursor },
    });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e?.message || "Server error" }, 500);
  }
}
