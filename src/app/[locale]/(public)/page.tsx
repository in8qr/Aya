import { getTranslations } from "next-intl/server";
import { HeroAnimated } from "@/components/home/hero-animated";
import { AnimateInView } from "@/components/ui/animate-in-view";

export default async function HomePage() {
  const t = await getTranslations("home");

  return (
    <>
      <HeroAnimated
        tagline={t("tagline")}
        title={t("title")}
        subtitle={t("subtitle")}
        viewPortfolio={t("viewPortfolio")}
        viewPackages={t("viewPackages")}
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
