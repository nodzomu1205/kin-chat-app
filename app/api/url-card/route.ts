import { handleUrlCardRoute } from "@/lib/server/urlCard/routeHandlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawUrl = (searchParams.get("url") || "").trim();
  return handleUrlCardRoute(rawUrl);
}
