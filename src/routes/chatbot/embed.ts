import { Env } from "../../index";

export async function embed(env: Env, text: string): Promise<number[]> {
  const result = await env.AI.run(
    "@cf/baai/bge-base-en-v1.5",
    { text: [text] }
  );

  return result.data[0];
}
