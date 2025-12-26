import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";

export async function waTemplateDeleteHandler(
  req: Request,
  env: any,
  id: string
): Promise<Response> {
  try {
    if (req.method !== "DELETE") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await auth(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    if (!id) {
      return jsonResponse({ success: false, error: "Missing template id" }, 400);
    }

    const companyId = session.companyId;

    const key = `template:${companyId}:${id}`;
    const idxKey = `template:index:company:${companyId}`;

    const existing = await env.KV.get(key);
    if (!existing) {
      return jsonResponse({ success: false, error: "Template not found" }, 404);
    }

    await env.KV.delete(key);

    // remove from index
    const list: string[] = (await env.KV.get(idxKey, { type: "json" })) || [];
    const next = list.filter((x) => x !== id);
    await env.KV.put(idxKey, JSON.stringify(next));

    return jsonResponse({ success: true });
  } catch (err: any) {
    console.error("waTemplateDelete error:", err);
    return jsonResponse({ success: false, error: "Failed to delete template" }, 500);
  }
}
