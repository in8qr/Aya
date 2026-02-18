"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { fetchJson } from "@/lib/fetch-safe";

type Package = {
  id: string;
  name: string;
  priceDisplay: string;
  durationMinutes: number;
  description: string | null;
  deliverables: string | null;
  visible: boolean;
};

export default function PackagesPage() {
  const t = useTranslations("packages");
  const tCommon = useTranslations("common");
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    fetchJson<Package[]>("/api/packages")
      .then((result) => {
        if (result.ok) {
          setPackages(Array.isArray(result.data) ? result.data : []);
        } else {
          setError(result.error);
          setPackages([]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="font-display text-4xl font-medium tracking-tight mb-2">{t("title")}</h1>
      <p className="text-muted-foreground mb-10 tracking-wide">{t("noOnlinePayments")}</p>
      {loading ? (
        <p className="text-muted-foreground">{t("loading")}</p>
      ) : error ? (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          <p className="font-medium">{t("errorTitle")}</p>
          <p className="mt-1">{error}</p>
          <p className="mt-2 text-muted-foreground">{t("errorHint")}</p>
        </div>
      ) : packages.length === 0 ? (
        <p className="text-muted-foreground">{t("noPackages")}</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="border-border bg-card">
              <CardHeader>
                <CardTitle>{pkg.name}</CardTitle>
                <CardDescription>
                  {pkg.priceDisplay} · {pkg.durationMinutes >= 60 ? `${pkg.durationMinutes / 60} ${tCommon("hour")}` : `${pkg.durationMinutes} ${tCommon("min")}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pkg.description && <p className="text-sm mb-2">{pkg.description}</p>}
                {pkg.deliverables && (
                  <p className="text-sm text-muted-foreground mb-4">{pkg.deliverables}</p>
                )}
                <Link href={`/booking?packageId=${pkg.id}`}>
                  <Button>{t("requestBooking")}</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
