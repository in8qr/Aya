import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getEmailFrom,
  setEmailFrom,
  getContactEmail,
  setContactEmail,
  getAppUrl,
  setAppUrl,
  SITE_SETTING_KEYS,
} from "@/lib/site-settings";
import { z } from "zod";

const patchBody = z.object({
  emailFrom: z.string().optional(),
  contactEmail: z.string().nullable().optional(),
  appUrl: z.string().url().nullable().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [emailFrom, contactEmail, appUrl] = await Promise.all([
    getEmailFrom(),
    getContactEmail(),
    getAppUrl(),
  ]);
  return NextResponse.json({
    keys: SITE_SETTING_KEYS,
    values: { emailFrom, contactEmail, appUrl },
  });
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
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }
  const { emailFrom, contactEmail, appUrl } = parsed.data;
  if (emailFrom !== undefined) await setEmailFrom(emailFrom?.trim() || null);
  if (contactEmail !== undefined) await setContactEmail(contactEmail?.trim() || null);
  if (appUrl !== undefined) await setAppUrl(appUrl?.trim() || null);
  const [newEmailFrom, newContactEmail, newAppUrl] = await Promise.all([
    getEmailFrom(),
    getContactEmail(),
    getAppUrl(),
  ]);
  return NextResponse.json({
    values: { emailFrom: newEmailFrom, contactEmail: newContactEmail, appUrl: newAppUrl },
  });
}
