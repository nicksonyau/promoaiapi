import { Env } from "../index";

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// GET /templates
export async function listTemplatesHandler(req: Request, env: Env): Promise<Response> {
  try {
    const list = await env.KV.list({ prefix: "template:" });
    const templates = [];

    for (const key of list.keys) {
      const data = await env.KV.get(key.name, "json");
      if (data) {
        templates.push({
          id: data.id,
          name: data.name || "",
          theme: data.theme || "",
          sections: data.sections || Object.keys(data.pages || {}),
        });
      }
    }

    return json({ templates });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
}