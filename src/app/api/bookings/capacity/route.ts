import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkCapacity, getDayBlockingWarning } from "@/lib/capacity";
import { z } from "zod";

const bodySchema = z.object({
  startAt: z.string().datetime(),
  durationMinutes: z.number().int().min(1),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const startAt = new Date(parsed.data.startAt);
  const result = await checkCapacity(startAt, parsed.data.durationMinutes);
  const warning = await getDayBlockingWarning(startAt);

  return NextResponse.json({
    allowed: result.allowed,
    reason: result.allowed ? undefined : result.reason,
    dayWarning: warning ?? undefined,
  });
}
