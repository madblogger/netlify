interface Env {
  AI: Ai;
}

interface ImageRequest {
  prompt?: string;
  width?: number;
  height?: number;
}

const MODEL = "@cf/black-forest-labs/flux-2-klein-9b";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "GET") {
      return Response.json({
        name: "madblogger-ai",
        model: MODEL,
        usage: "POST {\"prompt\": \"Describe the image to generate\"}",
      });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let body: ImageRequest;
    try {
      body = await request.json<ImageRequest>();
    } catch {
      return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    if (!body.prompt?.trim()) {
      return Response.json({ error: "A non-empty 'prompt' is required." }, { status: 400 });
    }

    const width = body.width ?? 1344;
    const height = body.height ?? 768;

    if (width < 256 || width > 2048 || height < 256 || height > 2048) {
      return Response.json(
        { error: "Image dimensions must be between 256 and 2048 pixels." },
        { status: 400 },
      );
    }

    try {
      const image = await env.AI.run(MODEL, {
        prompt: body.prompt,
        width,
        height,
      });

      return new Response(image as ReadableStream, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      return Response.json(
        {
          error: "Image generation failed.",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 502 },
      );
    }
  },
};
