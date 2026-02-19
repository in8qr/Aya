"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter as useLocaleRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { signIn, getSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";

const PENDING_PASSWORD_KEY = "aya_register_password";

function VerifyEmailForm() {
  const t = useTranslations("auth");
  const router = useLocaleRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") ?? "";

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    setEmail(emailFromQuery);
  }, [emailFromQuery]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? t("invalidOrExpiredCode"));
      return;
    }
    let pendingPassword: string | null = null;
    try {
      pendingPassword = sessionStorage.getItem(PENDING_PASSWORD_KEY);
      if (pendingPassword) sessionStorage.removeItem(PENDING_PASSWORD_KEY);
    } catch {
      // ignore
    }
    if (pendingPassword) {
      const signInResult = await signIn("credentials", {
        email,
        password: pendingPassword,
        redirect: false,
      });
      setLoading(false);
      if (signInResult?.ok) {
        const session = await getSession();
        const role = session?.user?.role;
        const base = `/${locale}`;
        const target = role === "ADMIN" ? `${base}/admin` : role === "TEAM" ? `${base}/team` : base;
        window.location.href = target;
        return;
      }
    }
    setLoading(false);
    router.push("/login?verified=1");
  }

  async function handleResend() {
    if (!email) {
      setError("Enter your email above first.");
      return;
    }
    setError("");
    setResendSent(false);
    setResendLoading(true);
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setResendLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not resend code.");
      return;
    }
    setResendSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader>
          <CardTitle className="font-display text-2xl font-medium tracking-tight">
            {t("verifyEmail")}
          </CardTitle>
          <CardDescription>{t("verifyEmailDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {resendSent && (
              <p className="text-sm text-green-600 dark:text-green-400">{t("resendCodeSent")}</p>
            )}
            <div>
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label htmlFor="otp">{t("verificationCode")}</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                className="mt-1 font-mono text-lg tracking-widest"
                placeholder="000000"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
              {loading ? t("verifying") : t("verify")}
            </Button>
          </form>
          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading || !email}
              className="text-primary hover:underline disabled:opacity-50"
            >
              {resendLoading ? "…" : t("resendCode")}
            </button>
            <Link href="/login" className="text-muted-foreground hover:underline">
              {t("login")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  const t = useTranslations("common");
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Suspense
        fallback={
          <Card className="w-full max-w-md border-border bg-card">
            <CardContent className="pt-6 text-muted-foreground">{t("loading")}</CardContent>
          </Card>
        }
      >
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}
