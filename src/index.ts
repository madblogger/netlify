interface Env {
  AI: Ai;
}

interface ImageRequest {
  prompt?: string;
  width?: number;
  height?: number;
}

interface ImageResult {
  image?: string;
}

const MODEL = "@cf/black-forest-labs/flux-2-klein-9b";
const VERSION = "multipart-v4";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "GET") {
      return Response.json({
        name: "madblogger-ai",
        version: VERSION,
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

    if (width < 256 || width > 1920 || height < 256 || height > 1920) {
      return Response.json(
        { error: "Image dimensions must be between 256 and 1920 pixels." },
        { status: 400 },
      );
    }

    try {
      const form = new FormData();
      form.append("prompt", body.prompt);
      form.append("width", String(width));
      form.append("height", String(height));

      // Serialize FormData so Workers AI receives the multipart boundary.
      const formResponse = new Response(form);
      const result = (await env.AI.run(MODEL, {
        multipart: {
          body: formResponse.body,
          contentType: formResponse.headers.get("content-type") ?? "multipart/form-data",
        },
      })) as ImageResult;

      if (!result.image) {
        throw new Error("Workers AI returned no image data.");
      }

      const binary = Uint8Array.from(atob(result.image), (character) => character.charCodeAt(0));
      return new Response(binary, {
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
