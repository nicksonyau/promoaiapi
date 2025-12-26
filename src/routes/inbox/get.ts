import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";
import type { Env } from "../../index";
import { getConversation } from "./kv";

export async function inboxGetHandler(req: Request, env: Env) {
  try {
    const { companyId } = await auth(req, env);

    const { searchParams } = new URL(req.url);
    const convKey = searchParams.get("convKey");

    if (!convKey) {
      return jsonResponse({ success: false, error: "INBOX_BAD_REQUEST" }, 400);
    }

    const conv = await getConversation(env, companyId, convKey);
    if (!conv) {
      return jsonResponse({ success: false, error: "INBOX_NOT_FOUND" }, 404);
    }

    return jsonResponse({ success: true, conversation: conv });
  } catch (e) {
    console.error("[inbox:get]", e);
    return jsonResponse({ success: false, error: "INBOX_INTERNAL" }, 500);
  }
}
