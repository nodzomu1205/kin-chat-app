import { handleLinkPreviewRoute } from "@/lib/server/linkPreview/routeHandlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get("url") || "";
  return handleLinkPreviewRoute(rawUrl);
}
