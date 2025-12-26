import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";

export async function waTemplateGetHandler(
  req: Request,
  env: any,
  id: string
): Promise<Response> {
  try {
    if (req.method !== "GET") {
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

    const template = await env.KV.get(key, { type: "json" });
    if (!template) {
      return jsonResponse({ success: false, error: "Template not found" }, 404);
    }

    return jsonResponse({ success: true, template });
  } catch (err: any) {
    console.error("waTemplateGet error:", err);
    return jsonResponse({ success: false, error: "Failed to load template" }, 500);
  }
}
