import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../../_lib/auth";

export async function chatbotFileDeleteHandler(req: Request, env: any, id: string) {
  console.log("🗑️ DELETE FILE REQUEST:", id);

  const session = await auth(env, req);
  if (!session?.companyId)
    return jsonResponse({ error: "Unauthorized" }, 401);

  const fileKey = `chatbot:file:${id}`;

  // ------------------------
  // LOAD FILE RECORD FIRST
  // ------------------------
  const file = await env.chatbotconfig.get(fileKey, { type: "json" });
  if (!file)
    return jsonResponse({ error: "File not found" }, 404);

  if (file.companyId !== session.companyId)
    return jsonResponse({ error: "Forbidden" }, 403);

  console.log("📄 Deleting file:", file.filename);

  // ------------------------
  // DELETE FILE RECORD
  // ------------------------
  await env.chatbotconfig.delete(fileKey);
  console.log("✅ Deleted file record");

  // ------------------------
  // DELETE ALL VECTORS
  // ------------------------
  const prefix = `chatbot:vector:${file.chatbotId}:${id}:`;

  console.log("🧹 Deleting vectors with prefix:", prefix);

  const list = await env.chatbotconfig.list({ prefix });

  for (const key of list.keys) {
    await env.chatbotconfig.delete(key.name);
    console.log("❌ Deleted vector:", key.name);
  }

  console.log(`✅ ${list.keys.length} vectors deleted`);

  // ------------------------
  // DELETE R2 FILE (OPTIONAL)
  // ------------------------
  if (env.MY_R2_BUCKET && file.r2Key) {
    console.log("☁️ Deleting R2:", file.r2Key);
    await env.MY_R2_BUCKET.delete(file.r2Key);
    console.log("✅ R2 object deleted");
  }

  console.log("✅ FILE FULLY REMOVED");

  return jsonResponse({ success: true });
}
