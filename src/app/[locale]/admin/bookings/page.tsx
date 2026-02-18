"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingDetailsModal } from "@/components/admin/booking-details-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

type Booking = {
  id: string;
  startAt: string;
  durationMinutes: number;
  status: string;
  location: string | null;
  customer: { name: string; email: string };
  package: { name: string };
  assignedTeam: { name: string } | null;
};

export default function AdminBookingsPage() {
  const t = useTranslations("admin");
  const tBookings = useTranslations("bookings");
  const tCommon = useTranslations("common");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then(setBookings)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <h1 className="font-display text-3xl font-medium tracking-tight mb-4">{t("bookings")}</h1>
      {loading ? (
        <p className="text-muted-foreground">{tCommon("loading")}</p>
      ) : (
        <div className="space-y-2">
          {bookings.map((b) => (
            <Card key={b.id} className="cursor-pointer border-border bg-card hover:bg-muted/50" onClick={() => setSelectedId(b.id)}>
              <CardHeader className="py-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{b.package.name} · {b.customer.name}</CardTitle>
                  <span className="text-sm text-muted-foreground">{tBookings(`status.${b.status}` as `status.${string}`) ?? b.status}</span>
                </div>
              </CardHeader>
              <CardContent className="py-0 pb-3 text-sm text-muted-foreground">
                {new Date(b.startAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                {b.assignedTeam && ` · ${b.assignedTeam.name}`}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("bookings")}</DialogTitle>
          </DialogHeader>
          {selectedId && <BookingDetailsModal bookingId={selectedId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
