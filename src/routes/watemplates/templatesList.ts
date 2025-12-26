import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";

export async function templatesListHandler(req: Request, env: any): Promise<Response> {
  try {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await auth(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const companyId = session.companyId;
    const idxKey = `template:index:company:${companyId}`;
    const ids: string[] = (await env.KV.get(idxKey, { type: "json" })) || [];

    const templates = (
      await Promise.all(ids.map((id) => env.KV.get(`template:${companyId}:${id}`, { type: "json" })))
    ).filter(Boolean);

    return jsonResponse({ success: true, templates });
  } catch (err: any) {
    console.error("templatesList error:", err);
    return jsonResponse({ success: false, error: "Failed to load templates" }, 500);
  }
}
