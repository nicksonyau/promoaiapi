import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../../_lib/auth";

export async function chatbotFileDeleteHandler(req: Request, env: any, id: string) {
  const session = await auth(env, req);
  if (!session?.companyId) return jsonResponse({ error: "Unauthorized" }, 401);

  const key = `chatbot:file:${id}`;
  await env.chatbotconfig.delete(key);

  return jsonResponse({ success: true });
}
