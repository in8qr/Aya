import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function ContactPage() {
  const t = await getTranslations("contact");

  return (
    <div className="container mx-auto px-4 max-w-2xl py-16">
      <h1 className="font-display text-4xl font-medium tracking-tight mb-6">
        {t("title")}
      </h1>
      <p className="text-muted-foreground mb-6">{t("intro")}</p>
      <Link href="/booking">
        <Button>{t("requestBooking")}</Button>
      </Link>
    </div>
  );
}
