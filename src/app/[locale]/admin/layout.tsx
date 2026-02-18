import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTranslations } from "next-intl/server";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const tCommon = await getTranslations("common");
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect(`/${locale}/login?callbackUrl=/${locale}/admin`);
  }

  const nav = [
    { href: "/admin" as const, label: t("calendar") },
    { href: "/admin/bookings" as const, label: t("bookings") },
    { href: "/admin/packages" as const, label: t("packages") },
    { href: "/admin/portfolio" as const, label: t("portfolio") },
    { href: "/admin/team" as const, label: t("team") },
    { href: "/admin/availability" as const, label: t("availability") },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-56 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <Link href="/admin" className="font-display font-semibold text-xl text-primary tracking-tight">
            {tCommon("brand")}
          </Link>
          <p className="text-xs text-muted-foreground mt-1 tracking-wide">{tCommon("admin")}</p>
        </div>
        <nav className="p-2 flex-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-2 border-t border-border">
          <Link href="/" className="block px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            {tCommon("backToSite")}
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-background">{children}</main>
    </div>
  );
}
