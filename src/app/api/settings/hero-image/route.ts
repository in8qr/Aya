import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getHeroImageUrl, setHeroImageUrl } from "@/lib/site-settings";
import { z } from "zod";

const patchBody = z.object({ url: z.string().url().nullable() });

export async function GET() {
  const url = await getHeroImageUrl();
  return NextResponse.json({ url });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  await setHeroImageUrl(parsed.data.url);
  return NextResponse.json({ url: parsed.data.url });
}
