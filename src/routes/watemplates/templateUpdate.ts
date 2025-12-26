import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";

export async function waTemplateUpdateHandler(req: Request, env: any, id: string): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await auth(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    if (!id) {
      return jsonResponse({ success: false, error: "Missing template id" }, 400);
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
    }

    const validation = validateTemplateInput(body);
    if (!validation.valid) {
      return jsonResponse({ success: false, error: validation.error }, 400);
    }

    const companyId = session.companyId;
    const key = `template:${companyId}:${id}`;

    const existing: any = await env.KV.get(key, { type: "json" });
    if (!existing) {
      return jsonResponse({ success: false, error: "Template not found" }, 404);
    }

    // ✅ Prevent editing after submission/approval (official template hygiene)
    if (["submitted", "approved"].includes(existing.status)) {
      return jsonResponse(
        { success: false, error: `Cannot edit template in status: ${existing.status}` },
        400
      );
    }

    const now = new Date().toISOString();
    const updated = { ...existing, ...validation.cleanedData, updatedAt: now };

    await env.KV.put(key, JSON.stringify(updated));
    return jsonResponse({ success: true, template: updated });
  } catch (err: any) {
    console.error("waTemplateUpdate error:", err);
    return jsonResponse({ success: false, error: "Failed to update template" }, 500);
  }
}

/* ----------------------------------
   VALIDATION (KEEP SAME STYLE)
---------------------------------- */
function validateTemplateInput(body: any) {
  const name = String(body?.name || "").trim();
  if (!name) return { valid: false, error: "Template name is required" };

  if (!/^[a-z0-9_]+$/.test(name)) {
    return { valid: false, error: "Template name must be lowercase snake_case" };
  }

  if (!["UTILITY", "AUTHENTICATION", "MARKETING"].includes(body.category)) {
    return { valid: false, error: "Invalid template category" };
  }

  if (!body.language) return { valid: false, error: "Language is required" };

  if (!Array.isArray(body.components) || body.components.length === 0) {
    return { valid: false, error: "Template components are required" };
  }

  const bodyComp = body.components.find((c: any) => c?.type === "BODY");
  if (!bodyComp?.text?.trim()) return { valid: false, error: "Template body is required" };

  const vars = [...String(bodyComp.text).matchAll(/{{(\d+)}}/g)].map((m) => Number(m[1]));
  if (vars.length) {
    const max = Math.max(...vars);
    for (let i = 1; i <= max; i++) {
      if (!vars.includes(i)) {
        return { valid: false, error: "Template variables must be sequential ({{1}}, {{2}}, ...)" };
      }
    }
  }

  const btnComp = body.components.find((c: any) => c?.type === "BUTTONS");
  if (btnComp?.buttons != null) {
    if (!Array.isArray(btnComp.buttons)) return { valid: false, error: "Buttons must be an array" };
    if (btnComp.buttons.length > 3) return { valid: false, error: "Max 3 buttons allowed" };

    for (const b of btnComp.buttons) {
      if (!b?.type || !b?.text?.trim()) return { valid: false, error: "Button type and text are required" };
      if (!["QUICK_REPLY", "URL", "PHONE_NUMBER"].includes(b.type)) {
        return { valid: false, error: "Invalid button type" };
      }
      if (b.type === "URL" && !b?.url?.trim()) return { valid: false, error: "URL button must include url" };
      if (b.type === "PHONE_NUMBER" && !b?.phone?.trim()) return { valid: false, error: "Phone button must include phone" };
    }
  }

  return {
    valid: true,
    cleanedData: {
      name,
      category: body.category,
      language: body.language,
      components: body.components,
    },
  };
}
