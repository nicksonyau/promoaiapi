import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../../_lib/auth";
import { nanoid } from "nanoid";

export async function chatbotFileUploadHandler(req: Request, env: any) {
  console.log("============================📥 Upload handler called");
  

  const session = await auth(env, req);
  if (!session?.companyId) return jsonResponse({ error: "Unauthorized" }, 401);

  const form = await req.formData();
  const file = form.get("file") as File;
  const chatbotId = form.get("chatbotId") as string;

  console.log("📤 Incoming:", file?.name, chatbotId);

  if (!file || !chatbotId)
    return jsonResponse({ error: "Missing file or chatbotId" }, 400);

  const id = nanoid();
  const safeName = file.name.replace(/[^\w.-]+/g, "_");
  const r2Key = `chatbot/${chatbotId}/files/${id}/${safeName}`;

  console.log("☁️ Writing R2:", r2Key);

  await env.MY_R2_BUCKET.put(r2Key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  const record = {
    id,
    chatbotId,
    companyId: session.companyId,
    filename: file.name,
    size: file.size,
    mime: file.type,
    r2Key,
    status: "uploaded",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const kvKey = `chatbot:file:${id}`;
  await env.chatbotconfig.put(kvKey, JSON.stringify(record));

  console.log("✅ Stored KV:", kvKey);

  return jsonResponse({ success: true, file: record });
}
