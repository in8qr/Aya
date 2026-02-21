"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type CarouselSlide = {
  id: string;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
};

const AUTOPLAY_MS = 5000;
const TRANSITION_MS = 600;

export function MovingPhotosCarousel({
  slides,
  variant = "default",
}: {
  slides: CarouselSlide[];
  variant?: "default" | "compact" | "heroOverlay";
}) {
  const [index, setIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const len = slides.length;

  const goTo = useCallback(
    (next: number) => {
      if (len <= 1) return;
      setIsTransitioning(true);
      setIndex((prev) => (prev + next + len) % len);
    },
    [len]
  );

  useEffect(() => {
    if (len <= 1) return;
    const t = setTimeout(() => goTo(1), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [index, len, goTo]);

  useEffect(() => {
    if (!isTransitioning) return;
    const t = setTimeout(() => setIsTransitioning(false), TRANSITION_MS);
    return () => clearTimeout(t);
  }, [isTransitioning]);

  if (slides.length === 0) return null;

  const isCompact = variant === "compact";
  const isHeroOverlay = variant === "heroOverlay";
  const aspectRatio = isHeroOverlay ? undefined : isCompact ? "3/1" : "21/9";
  const sectionClass = isHeroOverlay
    ? "group absolute inset-x-0 bottom-0 z-10 w-full overflow-hidden pointer-events-none [&_.carousel-interactive]:pointer-events-auto"
    : isCompact
      ? "group relative w-full overflow-hidden bg-muted/30 py-4"
      : "group relative w-full overflow-hidden bg-muted/30";
  const wrapperClass = isHeroOverlay
    ? "carousel-interactive absolute inset-x-0 bottom-0 h-[28vh] min-h-[180px] max-h-[280px] rounded-t-xl overflow-hidden shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
    : isCompact
      ? "max-w-5xl mx-auto rounded-lg overflow-hidden shadow-lg border border-border/50"
      : "";

  return (
    <section className={sectionClass}>
      <div className={wrapperClass}>
      <div
        className="relative flex transition-transform ease-out will-change-transform"
        style={{
          transform: `translateX(-${index * 100}%)`,
          transitionDuration: "600ms",
        }}
      >
        {slides.map((slide) => (
          <div
            key={slide.id}
            className="relative w-full shrink-0"
            style={aspectRatio ? { aspectRatio } : isHeroOverlay ? { height: "100%" } : undefined}
          >
            <Image
              src={slide.imageUrl}
              alt={slide.caption ?? "Gallery"}
              fill
              className="object-cover"
              sizes="100vw"
              priority={slide.sortOrder === 0}
            />
            {slide.caption && (
              <div
                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-6 sm:px-6 sm:py-8"
                aria-hidden
              >
                <p className="text-sm sm:text-base text-white/95 font-medium max-w-2xl mx-auto text-center drop-shadow-md">
                  {slide.caption}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {len > 1 && (
        <>
          {/* Dots */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-10 sm:bottom-4">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => {
                  setIndex(i);
                  setIsTransitioning(true);
                }}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === index
                    ? "w-6 bg-white shadow-md"
                    : "w-2 bg-white/50 hover:bg-white/70"
                )}
              />
            ))}
          </div>

          {/* Arrows - visible on hover/focus for larger screens */}
          <button
            type="button"
            aria-label="Previous"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-opacity opacity-70 hover:opacity-100 focus:opacity-100"
            onClick={() => goTo(-1)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-opacity opacity-70 hover:opacity-100 focus:opacity-100"
            onClick={() => goTo(1)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
      </div>
    </section>
  );
}
