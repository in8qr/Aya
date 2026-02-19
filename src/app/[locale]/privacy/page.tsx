import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { PublicHeader } from "@/components/layout/public-header";

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");
  const tFooter = await getTranslations("footer");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      <main className="flex-1 container mx-auto px-4 max-w-3xl py-12">
        <h1 className="font-display text-3xl font-medium tracking-tight mb-2">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t("lastUpdated")}</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-foreground">
          <p className="text-muted-foreground">{t("intro")}</p>

          <section>
            <h2 className="font-display text-xl font-medium mt-8 mb-2">{t("whatWeCollectTitle")}</h2>
            <p className="text-muted-foreground whitespace-pre-line">{t("whatWeCollect")}</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium mt-8 mb-2">{t("howWeUseTitle")}</h2>
            <p className="text-muted-foreground whitespace-pre-line">{t("howWeUse")}</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium mt-8 mb-2">{t("storageTitle")}</h2>
            <p className="text-muted-foreground whitespace-pre-line">{t("storage")}</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium mt-8 mb-2">{t("noSharingTitle")}</h2>
            <p className="text-muted-foreground whitespace-pre-line">{t("noSharing")}</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium mt-8 mb-2">{t("retentionTitle")}</h2>
            <p className="text-muted-foreground whitespace-pre-line">{t("retention")}</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium mt-8 mb-2">{t("yourRightsTitle")}</h2>
            <p className="text-muted-foreground whitespace-pre-line">{t("yourRights")}</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium mt-8 mb-2">{t("contactTitle")}</h2>
            <p className="text-muted-foreground whitespace-pre-line">{t("contact")}</p>
          </section>
        </div>

        <p className="mt-12 text-sm text-muted-foreground">
          <Link href="/" className="text-primary hover:underline">
            ← {t("backToHome")}
          </Link>
        </p>
      </main>
      <footer className="border-t border-border py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">{tFooter("privacyLink")}</Link>
          {" · "}
          <span>© {new Date().getFullYear()} Aya Eye</span>
        </div>
      </footer>
    </div>
  );
}
