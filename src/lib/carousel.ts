import { prisma } from "@/lib/prisma";

export type CarouselSlide = {
  id: string;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
};

export async function getCarouselSlides(): Promise<CarouselSlide[]> {
  const rows = await prisma.homeCarouselSlide.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, imageUrl: true, caption: true, sortOrder: true },
  });
  return rows;
}
