import { Env } from "../../../index";
import { jsonResponse } from "../../_lib/utils";
import { requireCompany } from "../../../_lib/auth";

export async function eventTypesUpdateHandler(req: Request, env: Env, id: string) {
  try {
    if (req.method !== "PUT") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await requireCompany(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const key = `webhook:event-type:${session.companyId}:${id}`;
    const existing = await env.KV.get(key, "json");
    if (!existing) {
      return jsonResponse({ success: false, error: "Not found" }, 404);
    }

    const body = await req.json().catch(() => null);
    if (!body?.name) {
      return jsonResponse({ success: false, error: "Missing name" }, 400);
    }

    const updated = {
      ...existing,
      name: body.name,
      description: body.description || "",
      updatedAt: new Date().toISOString(),
    };

    await env.KV.put(key, JSON.stringify(updated));

    return jsonResponse({ success: true, data: updated }, 200);
  } catch (e: any) {
    return jsonResponse({ success: false, error: e?.message || "Server error" }, 500);
  }
}
