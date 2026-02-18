import { NextRequest, NextResponse } from "next/server";
import { getPortfolioFileBuffer } from "@/lib/local-storage";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const key = (await params).key?.join("/");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }
  const buf = getPortfolioFileBuffer(key);
  if (!buf) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
