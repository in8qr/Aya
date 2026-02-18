"use client";

import { useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useSession, signOut } from "next-auth/react";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { ChevronDown, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
export function PublicHeader() {
  const { data: session, status } = useSession();
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = (
    <>
      <Link href="/portfolio" className="transition-colors hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
        {t("portfolio")}
      </Link>
      <Link href="/packages" className="transition-colors hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
        {t("packages")}
      </Link>
      <Link href="/about" className="transition-colors hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
        {t("about")}
      </Link>
      <Link href="/contact" className="transition-colors hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
        {t("contact")}
      </Link>
      {status === "loading" ? (
        <span className="text-muted-foreground text-sm">...</span>
      ) : session ? (
        <>
          {session.user.role === "ADMIN" && (
            <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start">{t("dashboard")}</Button>
            </Link>
          )}
          {session.user.role === "TEAM" && (
            <Link href="/team" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start">{t("myCalendar")}</Button>
            </Link>
          )}
          <Link href="/bookings" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full justify-start">{t("myBookings")}</Button>
          </Link>
          <div className="flex flex-col gap-1 border-t border-border pt-2 mt-2">
            <span className="text-muted-foreground text-xs px-2">{session.user.name ?? session.user.email}</span>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground"
              onClick={() => {
                setMobileMenuOpen(false);
                setShowSignOutConfirm(true);
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
              {t("logOut")}
            </Button>
          </div>
        </>
      ) : (
        <>
          <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full justify-start">{t("logIn")}</Button>
          </Link>
          <Link href="/booking" onClick={() => setMobileMenuOpen(false)}>
            <Button size="sm" className="w-full justify-center">{t("bookSession")}</Button>
          </Link>
        </>
      )}
      <div className="border-t border-border pt-2 mt-2">
        <LocaleSwitcher locale={locale} pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} />
      </div>
    </>
  );

  return (
    <header className="border-b border-border/80">
      <div className="container mx-auto px-4 min-h-14 sm:min-h-0 sm:h-20 flex items-center justify-between gap-2">
        <Link href="/" className="font-display font-semibold text-xl sm:text-2xl tracking-tight text-primary shrink-0">
          {tCommon("brand")}
        </Link>
        {/* Desktop nav */}
        <nav className="hidden md:flex gap-6 md:gap-8 items-center text-sm tracking-wide uppercase text-muted-foreground hover:text-foreground">
          <Link href="/portfolio" className="transition-colors hover:text-foreground">
            {t("portfolio")}
          </Link>
          <Link href="/packages" className="transition-colors hover:text-foreground">
            {t("packages")}
          </Link>
          <Link href="/about" className="transition-colors hover:text-foreground">
            {t("about")}
          </Link>
          <Link href="/contact" className="transition-colors hover:text-foreground">
            {t("contact")}
          </Link>
          {status === "loading" ? (
            <span className="text-muted-foreground text-sm">...</span>
          ) : session ? (
            <>
              {session.user.role === "ADMIN" && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm">{t("dashboard")}</Button>
                </Link>
              )}
              {session.user.role === "TEAM" && (
                <Link href="/team">
                  <Button variant="ghost" size="sm">{t("myCalendar")}</Button>
                </Link>
              )}
              <Link href="/bookings">
                <Button variant="ghost" size="sm">{t("myBookings")}</Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 uppercase tracking-wide text-muted-foreground hover:text-foreground data-[state=open]:text-foreground data-[state=open]:bg-accent"
                  >
                    {session.user.name ?? session.user.email}
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[11rem] border-border bg-popover">
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setShowSignOutConfirm(true);
                    }}
                    className="flex cursor-pointer items-center gap-2 focus:bg-accent focus:text-accent-foreground"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {t("logOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">{t("logIn")}</Button>
              </Link>
              <Link href="/booking">
                <Button size="sm">{t("bookSession")}</Button>
              </Link>
            </>
          )}
          <LocaleSwitcher locale={locale} pathname={pathname} />
        </nav>
        {/* Mobile: menu button + drawer */}
        <div className="flex md:hidden items-center gap-2">
          <LocaleSwitcher locale={locale} pathname={pathname} />
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="Menu"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DialogContent
          className="max-w-[min(90vw,20rem)] border-border bg-card p-4 sm:p-6 top-[4.5rem] translate-y-0"
          showClose={true}
        >
          <nav className="flex flex-col gap-1 text-sm tracking-wide uppercase text-muted-foreground">
            {navLinks}
          </nav>
        </DialogContent>
      </Dialog>
      <Dialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
        <DialogContent className="sm:max-w-xs border-border bg-card" showClose={true}>
          <DialogHeader>
            <DialogTitle className="font-display text-lg">{t("signOutConfirm")}</DialogTitle>
            <DialogDescription className="sr-only">{t("signOutConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShowSignOutConfirm(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setShowSignOutConfirm(false);
                const callbackUrl = `/${locale}${pathname}`;
                signOut({ redirect: false, callbackUrl }).then(() => {
                  window.location.href = callbackUrl;
                });
              }}
            >
              {t("logOut")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}

function LocaleSwitcher({
  locale,
  pathname,
  onNavigate,
}: {
  locale: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  const newLocale = locale === "en" ? "ar" : "en";
  return (
    <a
      href={`/${newLocale}${pathname}`}
      className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors py-2 min-h-[2.75rem] flex items-center"
      aria-label={newLocale === "ar" ? "العربية" : "English"}
      onClick={onNavigate}
    >
      {newLocale === "ar" ? "العربية" : "EN"}
    </a>
  );
}
