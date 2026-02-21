"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { MovingPhotosCarousel, type CarouselSlide } from "@/components/home/moving-photos-carousel";
import { cn } from "@/lib/utils";

const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1920&q=80";

const STAGGER_MS = 120;

export function HeroAnimated({
  tagline,
  title,
  subtitle,
  viewPortfolio,
  viewPackages,
  imageUrl,
  carouselSlides = [],
}: {
  tagline: string;
  title: string;
  subtitle: string;
  viewPortfolio: string;
  viewPackages: string;
  imageUrl?: string | null;
  carouselSlides?: CarouselSlide[];
}) {
  const src = imageUrl?.trim() || DEFAULT_HERO_IMAGE;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <section className="relative min-h-[70vh] sm:min-h-[80vh] md:min-h-[85vh] flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image
          src={src}
          alt=""
          fill
          priority
          className="object-cover transition-transform duration-700 ease-out hover:scale-[1.02]"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/75"
          aria-hidden
        />
      </div>
      <div className="relative z-10 flex flex-col items-center flex-1 justify-center w-full py-12 sm:py-20 md:py-24 lg:py-32 px-3 sm:px-4 text-center max-w-4xl mx-auto">
        <p
          className={cn(
            "text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/90 mb-4 sm:mb-6 transition-all duration-500 ease-out",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
          style={mounted ? { transitionDelay: "0ms" } : {}}
        >
          {tagline}
        </p>
        <h1
          className={cn(
            "font-display text-4xl sm:text-5xl md:text-7xl font-medium tracking-tight text-white mb-4 sm:mb-6 leading-[1.1] drop-shadow-lg transition-all duration-600 ease-out",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}
          style={mounted ? { transitionDelay: `${STAGGER_MS}ms` } : {}}
        >
          {title}
        </h1>
        <p
          className={cn(
            "text-base sm:text-lg md:text-xl text-white/90 max-w-xl mx-auto mb-8 sm:mb-12 leading-relaxed px-0 transition-all duration-600 ease-out",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}
          style={mounted ? { transitionDelay: `${STAGGER_MS * 2}ms` } : {}}
        >
          {subtitle}
        </p>
        <div
          className={cn(
            "flex gap-3 sm:gap-4 justify-center flex-wrap transition-all duration-500 ease-out",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
          style={mounted ? { transitionDelay: `${STAGGER_MS * 3}ms` } : {}}
        >
          <Link href="/portfolio">
            <Button
              size="lg"
              variant="outline"
              className="min-h-[2.75rem] border-white/40 bg-white/5 text-white hover:bg-white/15 rounded-none px-6 sm:px-8 tracking-wide uppercase text-xs backdrop-blur-sm touch-manipulation transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {viewPortfolio}
            </Button>
          </Link>
          <Link href="/packages">
            <Button
              size="lg"
              className="min-h-[2.75rem] bg-white text-black rounded-none px-6 sm:px-8 tracking-wide uppercase text-xs hover:bg-white/90 touch-manipulation transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {viewPackages}
            </Button>
          </Link>
        </div>
      </div>
      {carouselSlides.length > 0 && (
        <div className="relative z-10 w-full flex justify-center pb-6 sm:pb-8 md:pb-10 shrink-0">
          <MovingPhotosCarousel slides={carouselSlides} variant="heroOverlay" />
        </div>
      )}
    </section>
  );
}
