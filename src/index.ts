interface Env {
  AI: Ai;
}

interface RequestBody {
  prompt?: string;
  model?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "GET") {
      return Response.json({
        name: "madblogger-ai",
        usage: "POST {\"prompt\": \"Your question\"}",
      });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let body: RequestBody;
    try {
      body = await request.json<RequestBody>();
    } catch {
      return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    if (!body.prompt?.trim()) {
      return Response.json({ error: "A non-empty 'prompt' is required." }, { status: 400 });
    }

    const model = body.model ?? "@cf/meta/llama-3.1-8b-instruct-fast";
    const result = await env.AI.run(model, {
      messages: [{ role: "user", content: body.prompt }],
    });

    return Response.json({ model, result });
  },
};
