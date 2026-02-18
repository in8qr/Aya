import { PublicHeader } from "@/components/layout/public-header";
import { getTranslations } from "next-intl/server";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-10">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground tracking-wide">
          {t("copyright", { year })}
        </div>
      </footer>
    </div>
  );
}
