"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import { ArrowLeft, ExternalLink } from "lucide-react";

type ResultItem = { id: string; name: string; url: string };

export default function BookingResultsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const t = useTranslations("bookings");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ResultItem[] | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("wrongPassword"));
        return;
      }
      setResults(data.results ?? []);
    } catch {
      setError(t("wrongPassword"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      <main className="flex-1 container mx-auto px-3 sm:px-4 max-w-2xl py-8 sm:py-10">
        <Link
          href="/bookings"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t("title")}
        </Link>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl">{t("viewResults")}</CardTitle>
          </CardHeader>
          <CardContent>
            {results === null ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="results-password">{t("resultsPassword")}</Label>
                  <Input
                    id="results-password"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("resultsPasswordPlaceholder")}
                    autoComplete="off"
                    disabled={loading}
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <Button type="submit" disabled={loading}>
                  {loading ? "…" : t("submitPassword")}
                </Button>
              </form>
            ) : results.length === 0 ? (
              <p className="text-muted-foreground">{t("noResultsYet")}</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Your session results. Click to open.
                </p>
                <ul className="space-y-2">
                  {results.map((r) => (
                    <li key={r.id}>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:underline"
                      >
                        {r.name}
                        <ExternalLink className="h-4 w-4 shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

