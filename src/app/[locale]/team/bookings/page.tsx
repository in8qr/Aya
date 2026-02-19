"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { downloadICS } from "@/lib/ics";
import { CalendarPlus } from "lucide-react";

type Booking = {
  id: string;
  startAt: string;
  durationMinutes: number;
  status: string;
  location: string | null;
  notes: string | null;
  customer: { name: string; email: string; phone: string | null };
  package: { name: string };
};

export default function TeamBookingsPage() {
  const t = useTranslations("team");
  const tBookings = useTranslations("bookings");
  const tCommon = useTranslations("common");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookings").then((r) => r.json()).then(setBookings).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <h1 className="font-display text-3xl font-medium tracking-tight mb-4">{t("assignedBookings")}</h1>
      {loading ? (
        <p className="text-muted-foreground">{tCommon("loading")}</p>
      ) : bookings.length === 0 ? (
        <p className="text-muted-foreground">You have no assigned bookings.</p>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <Card key={b.id} className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">{b.package.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {new Date(b.startAt).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })} · {b.durationMinutes} {tCommon("min")} · {tBookings(`status.${b.status}` as `status.${string}`) ?? b.status}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">Customer: {b.customer.name}</p>
                <p className="text-sm">Email: {b.customer.email}</p>
                {b.customer.phone && <p className="text-sm">Phone: {b.customer.phone}</p>}
                {b.location && <p className="text-sm">{tBookings("locationLabel")}: {b.location}</p>}
                {b.notes && <p className="text-sm text-muted-foreground">Notes: {b.notes}</p>}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() =>
                    downloadICS({
                      title: `${b.package.name} – ${b.customer.name}`,
                      startAt: b.startAt,
                      durationMinutes: b.durationMinutes,
                      location: b.location,
                      description: b.notes
                        ? `Customer: ${b.customer.name}. ${b.notes}`
                        : `Customer: ${b.customer.name}`,
                    })
                  }
                >
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  {t("addToCalendar")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
