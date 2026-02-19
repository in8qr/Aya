import { getTranslations } from "next-intl/server";
import { HeroAnimated } from "@/components/home/hero-animated";
import { AnimateInView } from "@/components/ui/animate-in-view";
import { getHeroImageUrl } from "@/lib/site-settings";

export default async function HomePage() {
  const t = await getTranslations("home");
  const heroImageUrl = await getHeroImageUrl();

  return (
    <>
      <HeroAnimated
        tagline={t("tagline")}
        title={t("title")}
        subtitle={t("subtitle")}
        viewPortfolio={t("viewPortfolio")}
        viewPackages={t("viewPackages")}
        imageUrl={heroImageUrl}
      />
      <AnimateInView animation="fade-in-up">
        <section className="border-t border-border py-12 px-4 text-center">
          <p className="text-sm text-muted-foreground tracking-wide">
            {t("noOnlinePayments")}
          </p>
        </section>
      </AnimateInView>
    </>
  );
}
