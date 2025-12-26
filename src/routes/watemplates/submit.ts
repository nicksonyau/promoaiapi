import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";

export async function templatesSubmitHandler(req: Request, env: any) {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await auth(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => null);
    const id = body?.id;

    if (!id || typeof id !== "string") {
      return jsonResponse({ success: false, error: "Missing template id" }, 400);
    }

    const companyId = session.companyId;
    const key = `template:${companyId}:${id}`;

    const template: any = await env.KV.get(key, { type: "json" });
    if (!template) {
      return jsonResponse({ success: false, error: "Template not found" }, 404);
    }

    // ✅ Status rules (official flow)
    // Allow submit only from draft/rejected
    if (!["draft", "rejected"].includes(template.status)) {
      return jsonResponse(
        {
          success: false,
          error: `Cannot submit template in status: ${template.status}`,
        },
        400
      );
    }

    // 🔗 HERE later: call Twilio / 360dialog API

    const now = new Date().toISOString();
    const updated = {
      ...template,
      status: "submitted",
      submittedAt: now,
      updatedAt: now,
    };

    await env.KV.put(key, JSON.stringify(updated));

    return jsonResponse({ success: true, template: updated });
  } catch (err: any) {
    console.error("templatesSubmit error:", err);
    return jsonResponse({ success: false, error: "Failed to submit template" }, 500);
  }
}
