import { Env } from "../index";

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// POST /template/update/:id
export async function updateTemplateHandler(req: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();

    if (!id) return json({ error: "Missing template ID" }, 400);

    const body = await req.json();
    const { name, theme, sections, pages, products } = body;

    const template = { id, name, theme, sections, pages, products };
    await env.KV.put(`template:${id}`, JSON.stringify(template));

    return json({ success: true, template });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
}