"use client";

import { Suspense, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";

function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      setLoading(false);
      if (res?.error) {
        const isDbError = /database|postgres|unavailable/i.test(res.error);
        setError(
          isDbError
            ? t("dbError")
            : res.error === "CredentialsSignin"
              ? t("invalidCredentials")
              : res.error
        );
        return;
      }
      if (res?.ok) {
        const session = await getSession();
        const role = session?.user?.role;
        let target: string;
        if (role === "ADMIN") target = `/${locale}/admin`;
        else if (role === "TEAM") target = `/${locale}/team`;
        else if (callbackUrl === "/" || callbackUrl === "") target = `/${locale}`;
        else if (/^\/(en|ar)\b/.test(callbackUrl)) target = callbackUrl;
        else target = `/${locale}${callbackUrl}`;
        window.location.href = target;
      }
    } catch {
      setLoading(false);
      setError(t("serverError"));
    }
  }

  return (
    <Card className="w-full max-w-md border-border bg-card">
      <CardHeader>
        <CardTitle className="font-display text-2xl font-medium tracking-tight">{t("login")}</CardTitle>
        <CardDescription>{t("loginDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div>
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">{t("password")}</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("signingIn") : t("signIn")}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href="/register" className="text-primary hover:underline">
            {t("register")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  const tCommon = useTranslations("common");
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Suspense fallback={<Card className="w-full max-w-md border-border"><CardContent className="pt-6 text-muted-foreground">{tCommon("loading")}</CardContent></Card>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
