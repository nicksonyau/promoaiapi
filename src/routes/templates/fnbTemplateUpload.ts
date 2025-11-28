import { Env } from "../index";

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// POST /template/upload
export async function uploadTemplateHandler(req: Request, env: Env): Promise<Response> {
  try {
    const body = await req.json();
    const { id, name, theme, sections, pages, products } = body;

    if (!id || !name) {
      return json({ error: "Missing id or name" }, 400);
    }

    const template = { id, name, theme, sections, pages, products };
    await env.KV.put(`template:${id}`, JSON.stringify(template));

    return json({ success: true, template });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
}