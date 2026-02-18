import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1920&q=80";

export default async function HomePage() {
  const t = await getTranslations("home");

  return (
    <>
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/75"
            aria-hidden
          />
        </div>
        <div className="relative z-10 py-16 sm:py-24 md:py-32 px-4 text-center max-w-4xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/90 mb-4 sm:mb-6">
            {t("tagline")}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-medium tracking-tight text-white mb-4 sm:mb-6 leading-[1.1] drop-shadow-lg">
            {t("title")}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-xl mx-auto mb-8 sm:mb-12 leading-relaxed px-0">
            {t("subtitle")}
          </p>
          <div className="flex gap-3 sm:gap-4 justify-center flex-wrap">
            <Link href="/portfolio">
              <Button
                size="lg"
                variant="outline"
                className="min-h-[2.75rem] border-white/40 bg-white/5 text-white hover:bg-white/15 rounded-none px-6 sm:px-8 tracking-wide uppercase text-xs backdrop-blur-sm touch-manipulation"
              >
                {t("viewPortfolio")}
              </Button>
            </Link>
            <Link href="/packages">
              <Button
                size="lg"
                className="min-h-[2.75rem] bg-white text-black rounded-none px-6 sm:px-8 tracking-wide uppercase text-xs hover:bg-white/90 touch-manipulation"
              >
                {t("viewPackages")}
              </Button>
            </Link>
          </div>
        </div>
        </section>
      <section className="border-t border-border py-12 px-4 text-center">
        <p className="text-sm text-muted-foreground tracking-wide">
          {t("noOnlinePayments")}
        </p>
      </section>
    </>
  );
}
