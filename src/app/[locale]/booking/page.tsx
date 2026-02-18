"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { PublicHeader } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput, TimeInput } from "@/components/ui/date-time-inputs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { fetchJson } from "@/lib/fetch-safe";

type Package = {
  id: string;
  name: string;
  priceDisplay: string;
  durationMinutes: number;
};

function BookingContent() {
  const t = useTranslations("booking");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const packageIdParam = searchParams.get("packageId");
  const { toast } = useToast();

  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(packageIdParam);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [dayWarning, setDayWarning] = useState<string | null>(null);
  const [capacityError, setCapacityError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/packages")
      .then((r) => r.json())
      .then(setPackages);
  }, []);

  useEffect(() => {
    if (packageIdParam && packages.some((p) => p.id === packageIdParam)) {
      setSelectedPackageId(packageIdParam);
    }
  }, [packageIdParam, packages]);

  const selectedPackage = packages.find((p) => p.id === selectedPackageId);
  const durationMinutes = selectedPackage?.durationMinutes ?? 60;

  const checkCapacityForDateTime = useCallback(async () => {
    if (!date || !time || !selectedPackage) return;
    const startAt = new Date(`${date}T${time}`);
    const res = await fetch("/api/bookings/capacity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startAt: startAt.toISOString(), durationMinutes }),
    });
    const data = await res.json();
    setCapacityError(data.allowed ? null : data.reason ?? null);
    setDayWarning(data.dayWarning ?? null);
  }, [date, time, selectedPackage, durationMinutes]);

  useEffect(() => {
    if (date && time) checkCapacityForDateTime();
    else {
      setCapacityError(null);
      setDayWarning(null);
    }
  }, [date, time, checkCapacityForDateTime]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPackage || !date || !time) return;
    setLoading(true);
    const startAt = new Date(`${date}T${time}`);
    const result = await fetchJson<unknown>("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packageId: selectedPackage.id,
        startAt: startAt.toISOString(),
        durationMinutes,
        location: location || undefined,
        notes: notes || undefined,
      }),
    });
    setLoading(false);
    if (!result.ok) {
      toast({
        title: t("requestFailed"),
        description: result.error ?? t("submitError"),
        variant: "destructive",
      });
      return;
    }
    setSubmitted(true);
    toast({ title: t("successTitle"), description: t("successMessage") });
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-border bg-card">
            <CardHeader>
              <CardTitle className="font-display text-2xl font-medium tracking-tight">{t("successTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{t("successMessage")}</p>
              <Link href="/bookings">
                <Button>{t("viewMyBookings")}</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      <main className="flex-1 container mx-auto px-4 py-8 sm:py-12 max-w-lg">
        <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-tight mb-4 sm:mb-6">{t("title")}</h1>
        <p className="text-muted-foreground mb-6 tracking-wide text-sm sm:text-base">{t("offlineNote")}</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label>{t("package")}</Label>
            <select
              className="mt-1 flex h-11 min-h-[2.75rem] w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-sm touch-manipulation"
              value={selectedPackageId ?? ""}
              onChange={(e) => setSelectedPackageId(e.target.value || null)}
              required
            >
              <option value="">{t("selectPackage")}</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.priceDisplay} ({p.durationMinutes >= 60 ? `${p.durationMinutes / 60} ${tCommon("hour")}` : `${p.durationMinutes} ${tCommon("min")}`})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>{t("startDate")}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
              <div>
                <Label htmlFor="date" className="text-xs text-muted-foreground">{t("date")}</Label>
                <DateInput id="date" value={date} onChange={(e) => setDate(e.target.value)} required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="time" className="text-xs text-muted-foreground">{t("time")}</Label>
                <TimeInput id="time" value={time} onChange={(e) => setTime(e.target.value)} required className="mt-1" />
              </div>
            </div>
          </div>
          {date && time && selectedPackage && (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{t("endAuto")}: </span>
              <span className="font-medium">
                {(() => {
                  const start = new Date(`${date}T${time}`);
                  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
                  return end.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
                })()}
              </span>
            </div>
          )}
          {dayWarning && <p className="text-sm text-amber-600 dark:text-amber-400">{dayWarning}</p>}
          {capacityError && <p className="text-sm text-destructive">{capacityError}</p>}
          <div>
            <Label htmlFor="location">{t("location")}</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" />
          </div>
          <p className="text-sm text-muted-foreground">
            {t("dataNoticePrefix")}
            <Link href="/privacy" className="text-primary hover:underline">
              {t("dataNoticeLink")}
            </Link>
            {t("dataNoticeSuffix")}
          </p>
          <Button type="submit" disabled={loading || !!capacityError} className="min-h-[2.75rem] w-full sm:w-auto">
            {loading ? t("submitting") : t("submit")}
          </Button>
        </form>
      </main>
    </div>
  );
}

export default function BookingPage() {
  const tCommon = useTranslations("common");
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">{tCommon("loading")}</p></div>}>
      <BookingContent />
    </Suspense>
  );
}
