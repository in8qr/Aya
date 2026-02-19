import { getTranslations } from "next-intl/server";
import { AnimateInView } from "@/components/ui/animate-in-view";

export default async function AboutPage() {
  const t = await getTranslations("about");

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <AnimateInView animation="fade-in-up">
        <h1 className="font-display text-4xl font-medium tracking-tight mb-6">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mb-4">{t("intro")}</p>
        <p className="text-muted-foreground">{t("bookingNote")}</p>
      </AnimateInView>
    </div>
  );
}
