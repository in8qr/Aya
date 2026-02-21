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
  getSmtpHost,
  setSmtpHost,
  getSmtpUser,
  setSmtpUser,
  getSmtpPassword,
  setSmtpPassword,
  getSmtpPort,
  setSmtpPort,
  getSmtpSecure,
  setSmtpSecure,
  SITE_SETTING_KEYS,
} from "@/lib/site-settings";
import { z } from "zod";

const PASSWORD_MASK = "********";

const patchBody = z.object({
  emailFrom: z.string().optional(),
  contactEmail: z.string().nullable().optional(),
  appUrl: z.string().url().nullable().optional(),
  smtpHost: z.string().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpPort: z.union([z.number(), z.string()]).optional(),
  smtpSecure: z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [
    emailFrom,
    contactEmail,
    appUrl,
    smtpHost,
    smtpUser,
    smtpPasswordRaw,
    smtpPort,
    smtpSecure,
  ] = await Promise.all([
    getEmailFrom(),
    getContactEmail(),
    getAppUrl(),
    getSmtpHost(),
    getSmtpUser(),
    getSmtpPassword(),
    getSmtpPort(),
    getSmtpSecure(),
  ]);
  const smtpPassword = smtpPasswordRaw ? PASSWORD_MASK : "";
  return NextResponse.json({
    keys: SITE_SETTING_KEYS,
    values: {
      emailFrom,
      contactEmail,
      appUrl,
      smtpHost: smtpHost ?? "",
      smtpUser: smtpUser ?? "",
      smtpPassword,
      smtpPort,
      smtpSecure,
    },
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
  const {
    emailFrom,
    contactEmail,
    appUrl,
    smtpHost,
    smtpUser,
    smtpPassword,
    smtpPort,
    smtpSecure,
  } = parsed.data;
  if (emailFrom !== undefined) await setEmailFrom(emailFrom?.trim() || null);
  if (contactEmail !== undefined) await setContactEmail(contactEmail?.trim() || null);
  if (appUrl !== undefined) await setAppUrl(appUrl?.trim() || null);
  if (smtpHost !== undefined) await setSmtpHost(smtpHost?.trim() || null);
  if (smtpUser !== undefined) await setSmtpUser(smtpUser?.trim() || null);
  if (smtpPassword !== undefined && smtpPassword !== "" && smtpPassword !== PASSWORD_MASK) {
    await setSmtpPassword(smtpPassword);
  }
  if (smtpPort !== undefined) {
    const port = typeof smtpPort === "string" ? smtpPort.trim() : String(smtpPort);
    await setSmtpPort(port || null);
  }
  if (smtpSecure !== undefined) await setSmtpSecure(smtpSecure);
  const [
    newEmailFrom,
    newContactEmail,
    newAppUrl,
    newSmtpHost,
    newSmtpUser,
    newSmtpPasswordRaw,
    newSmtpPort,
    newSmtpSecure,
  ] = await Promise.all([
    getEmailFrom(),
    getContactEmail(),
    getAppUrl(),
    getSmtpHost(),
    getSmtpUser(),
    getSmtpPassword(),
    getSmtpPort(),
    getSmtpSecure(),
  ]);
  return NextResponse.json({
    values: {
      emailFrom: newEmailFrom,
      contactEmail: newContactEmail,
      appUrl: newAppUrl,
      smtpHost: newSmtpHost ?? "",
      smtpUser: newSmtpUser ?? "",
      smtpPassword: newSmtpPasswordRaw ? PASSWORD_MASK : "",
      smtpPort: newSmtpPort,
      smtpSecure: newSmtpSecure,
    },
  });
}
