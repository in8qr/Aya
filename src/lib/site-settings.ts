import { prisma } from "@/lib/prisma";

const HERO_IMAGE_KEY = "heroImageUrl";
const EMAIL_FROM_KEY = "emailFrom";
const CONTACT_EMAIL_KEY = "contactEmail";
const APP_URL_KEY = "appUrl";

export async function getHeroImageUrl(): Promise<string | null> {
  try {
    const row = await prisma.siteSetting.findUnique({
      where: { key: HERO_IMAGE_KEY },
    });
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function setHeroImageUrl(url: string | null): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: HERO_IMAGE_KEY },
    create: { key: HERO_IMAGE_KEY, value: url },
    update: { value: url },
  });
}

/** Get a site setting by key. Returns null if not set or on error. */
export async function getSiteSetting(key: string): Promise<string | null> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  } catch {
    return null;
  }
}

/** Set a site setting. Pass null to remove. */
export async function setSiteSetting(key: string, value: string | null): Promise<void> {
  if (value === null || value === "") {
    await prisma.siteSetting.deleteMany({ where: { key } });
    return;
  }
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

/** Email "From" for all outgoing emails (DB overrides env). */
export async function getEmailFrom(): Promise<string> {
  const db = await getSiteSetting(EMAIL_FROM_KEY);
  if (db?.trim()) return db.trim();
  return (
    process.env.EMAIL_VERIFICATION_FROM ||
    process.env.EMAIL_FROM ||
    "Aya Eye <noreply@example.com>"
  );
}

export async function setEmailFrom(value: string | null): Promise<void> {
  await setSiteSetting(EMAIL_FROM_KEY, value);
}

/** Contact email shown on site / reply-to (optional). */
export async function getContactEmail(): Promise<string | null> {
  const db = await getSiteSetting(CONTACT_EMAIL_KEY);
  if (db?.trim()) return db.trim();
  return process.env.CONTACT_EMAIL ?? null;
}

export async function setContactEmail(value: string | null): Promise<void> {
  await setSiteSetting(CONTACT_EMAIL_KEY, value);
}

/** Public app URL (e.g. for links in emails). DB overrides NEXT_PUBLIC_APP_URL. */
export async function getAppUrl(): Promise<string> {
  const db = await getSiteSetting(APP_URL_KEY);
  if (db?.trim()) return db.trim();
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function setAppUrl(value: string | null): Promise<void> {
  await setSiteSetting(APP_URL_KEY, value);
}

/** All admin-editable env-like keys and labels. */
export const SITE_SETTING_KEYS = {
  emailFrom: { label: "Email From (sender for all emails)", placeholder: "Aya Eye <noreply@yoursite.com>" },
  contactEmail: { label: "Contact Email (optional, for footer/contact)", placeholder: "hello@yoursite.com" },
  appUrl: { label: "Site URL (for links in emails)", placeholder: "https://aya.example.com" },
} as const;
