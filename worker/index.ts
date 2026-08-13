import { fetchPlayerDataFromLoki } from "./loki-client";

interface RequestBody {
  environment: string;
  userId: string;
  clientSecret: string;
  snowId?: string;
}

// Cloudflare serves a matching file out of the [assets] directory before this Worker ever runs
// (the default when both `main` and `[assets]` are configured), so this only needs to handle the
// one route that isn't a static file - everything else falling through here is a genuine 404.
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/fetch-player-data" && request.method === "POST") {
      const body = (await request.json()) as RequestBody;
      try {
        const data = await fetchPlayerDataFromLoki(
          body.environment,
          body.userId,
          body.clientSecret,
          body.snowId ?? "",
        );
        return Response.json(data);
      } catch (error) {
        return Response.json({ error: `${error}` }, { status: 502 });
      }
    }
    return new Response("Not found", { status: 404 });
  },
};
