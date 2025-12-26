import { Env } from "../../index";
import { jsonResponse } from "../_lib/utils";
import { requireCompany } from "../../_lib/auth";

export async function chatWidgetAppearanceUpdateHandler(
  req: Request,
  env: Env,
  widgetId: string
) {
  const session = await auth(env, req);
  if (!session?.companyId) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  const body = await req.json().catch(() => null);
  if (!body?.appearance) {
    return jsonResponse({ success: false, error: "Invalid payload" }, 400);
  }

  const key = `chatwidget:${session.companyId}:${widgetId}`;

  const record = {
    widgetId,
    companyId: session.companyId,
    appearance: body.appearance,
    conversationStarters: body.conversationStarters ?? [],
    updatedAt: new Date().toISOString(),
  };

  await env.CHAT_WIDGET_KV.put(key, JSON.stringify(record));

  return jsonResponse({ success: true });
}
