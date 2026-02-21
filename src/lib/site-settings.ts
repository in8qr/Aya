import { prisma } from "@/lib/prisma";

const HERO_IMAGE_KEY = "heroImageUrl";

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
