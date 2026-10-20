import { captionsVtt } from "@/lib/walkthrough";

export const dynamic = "force-static";

export function GET() {
  return new Response(captionsVtt(), { headers: { "Content-Type": "text/vtt; charset=utf-8" } });
}
