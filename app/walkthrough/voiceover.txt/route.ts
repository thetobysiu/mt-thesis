import { voiceoverText } from "@/lib/walkthrough";

export const dynamic = "force-static";

export function GET() {
  return new Response(voiceoverText(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
