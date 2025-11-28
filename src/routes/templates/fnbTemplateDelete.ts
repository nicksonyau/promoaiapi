import { Env } from "../index";

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// DELETE /template/delete/:id
export async function deleteTemplateHandler(req: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();

    if (!id) return json({ success: false, error: "Missing template ID" }, 400);

    const key = `template:${id}`;
    const existing = await env.KV.get(key);

    if (!existing) {
      return json({ success: false, error: "Template not found" }, 404);
    }

    await env.KV.delete(key);
    return json({ success: true });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
}