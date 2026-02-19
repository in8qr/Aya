import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { AnimateInView } from "@/components/ui/animate-in-view";

export default async function ContactPage() {
  const t = await getTranslations("contact");

  return (
    <div className="container mx-auto px-4 max-w-2xl py-16">
      <AnimateInView animation="fade-in-up">
        <h1 className="font-display text-4xl font-medium tracking-tight mb-6">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mb-6">{t("intro")}</p>
        <Link href="/booking">
          <Button className="transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]">{t("requestBooking")}</Button>
        </Link>
      </AnimateInView>
    </div>
  );
}
