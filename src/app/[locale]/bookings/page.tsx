"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { PublicHeader } from "@/components/layout/public-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

type Booking = {
  id: string;
  startAt: string;
  durationMinutes: number;
  status: string;
  location: string | null;
  package: { name: string };
  assignedTeam?: { name: string } | null;
};

export default function MyBookingsPage() {
  const t = useTranslations("bookings");
  const tCommon = useTranslations("common");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then(setBookings)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="font-display text-4xl font-medium tracking-tight mb-6">{t("title")}</h1>
        {loading ? (
          <p className="text-muted-foreground">{t("loading")}</p>
        ) : bookings.length === 0 ? (
          <p className="text-muted-foreground mb-4">{t("noBookings")}</p>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <Card key={b.id} className="border-border bg-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">{b.package.name}</CardTitle>
                  <span className="text-sm font-normal text-muted-foreground">
                    {t(`status.${b.status}` as `status.${string}`) ?? b.status}
                  </span>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {new Date(b.startAt).toLocaleString(undefined, {
                      dateStyle: "full",
                      timeStyle: "short",
                    })}
                    {" · "}
                    {b.durationMinutes} {tCommon("min")}
                  </p>
                  {b.assignedTeam && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("photographer")}: {b.assignedTeam.name}
                    </p>
                  )}
                  {b.location && (
                    <p className="text-sm text-muted-foreground">{t("locationLabel")}: {b.location}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <Link href="/booking" className="inline-block mt-6">
          <Button>{t("requestNewBooking")}</Button>
        </Link>
      </main>
    </div>
  );
}
