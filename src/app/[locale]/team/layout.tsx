import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTranslations } from "next-intl/server";

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const tTeam = await getTranslations("team");
  const tCommon = await getTranslations("common");
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "TEAM" && session.user.role !== "ADMIN")) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/team`);
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-48 border-r border-border bg-card p-4">
        <Link href="/team" className="font-display font-semibold text-lg text-primary tracking-tight">
          {tCommon("brand")}
        </Link>
        <p className="text-xs text-muted-foreground mt-1 tracking-wide">{tCommon("team")}</p>
        <nav className="mt-4 space-y-1">
          <Link href="/team" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">{t("calendar")}</Link>
          <Link href="/team/bookings" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">{tTeam("assignedBookings")}</Link>
        </nav>
        <Link href="/" className="block mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {tCommon("backToSite")}
        </Link>
      </aside>
      <main className="flex-1 overflow-auto bg-background">{children}</main>
    </div>
  );
}
