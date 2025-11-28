import { Env } from "../index";

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// GET /template/:id
export async function getTemplateHandler(req: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();

    if (!id) return json({ error: "Missing template ID" }, 400);

    const data = await env.KV.get(`template:${id}`, "json");

    if (!data) return json({ error: "Template not found" }, 404);

    return json({
      id: data.id,
      name: data.name || "",
      theme: data.theme || "",
      sections: data.sections || Object.keys(data.pages || {}),
      pages: data.pages || {},
      products: data.products || [],
    });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
}