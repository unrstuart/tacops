import { fetchPlayerDataFromLoki } from "../_lib/loki-client";

interface RequestBody {
  environment: string;
  userId: string;
  clientSecret: string;
  snowId?: string;
}

export const onRequestPost: PagesFunction = async (context) => {
  const body = (await context.request.json()) as RequestBody;
  try {
    const data = await fetchPlayerDataFromLoki(body.environment, body.userId, body.clientSecret, body.snowId ?? "");
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: `${error}` }, { status: 502 });
  }
};
