import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getReceiptFileBuffer } from "@/lib/local-storage";

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key?: string[] }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = (await params).key?.join("/");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }
  const buf = getReceiptFileBuffer(key);
  if (!buf) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": "inline",
    },
  });
}
