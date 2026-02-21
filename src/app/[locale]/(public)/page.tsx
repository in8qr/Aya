import { getTranslations } from "next-intl/server";
import { HeroAnimated } from "@/components/home/hero-animated";
import { AnimateInView } from "@/components/ui/animate-in-view";
import { getHeroImageUrl } from "@/lib/site-settings";
import { getCarouselSlides } from "@/lib/carousel";

export default async function HomePage() {
  const t = await getTranslations("home");
  const [heroImageUrl, carouselSlides] = await Promise.all([
    getHeroImageUrl(),
    getCarouselSlides(),
  ]);

  return (
    <>
      <HeroAnimated
        tagline={t("tagline")}
        title={t("title")}
        subtitle={t("subtitle")}
        viewPortfolio={t("viewPortfolio")}
        viewPackages={t("viewPackages")}
        imageUrl={heroImageUrl}
        carouselSlides={carouselSlides}
      />
      <AnimateInView animation="fade-in-up">
        <section className="border-t border-border py-8 sm:py-12 px-3 sm:px-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground tracking-wide max-w-xl mx-auto">
            {t("noOnlinePayments")}
          </p>
        </section>
      </AnimateInView>
    </>
  );
}
