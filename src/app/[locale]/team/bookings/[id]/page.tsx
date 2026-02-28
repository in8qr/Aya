"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { downloadICS } from "@/lib/ics";
import { CalendarPlus, ArrowLeft, Upload } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const SESSION_STATUSES = ["BOOKED", "IN_PROGRESS", "WAITING_RESULTS", "COMPLETED"] as const;

type Booking = {
  id: string;
  startAt: string;
  durationMinutes: number;
  status: string;
  sessionStatus: string;
  resultsNotifiedAt: string | null;
  location: string | null;
  notes: string | null;
  customer: { name: string; email: string; phone: string | null };
  package: { name: string };
  attachments: { id: string; name: string; type: string }[];
};

export default function TeamBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const t = useTranslations("team");
  const tBookings = useTranslations("bookings");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionStatus, setSessionStatus] = useState<string>("");
  const [sessionStatusSaving, setSessionStatusSaving] = useState(false);
  const [resultsPassword, setResultsPassword] = useState("");
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch(`/api/bookings/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((b: Booking) => {
        setBooking(b);
        setSessionStatus(b.sessionStatus ?? "BOOKED");
      })
      .catch(() => router.replace("/team/bookings"))
      .finally(() => setLoading(false));
  }, [id, router]);

  const sessionResults = booking?.attachments?.filter((a) => a.type === "SESSION_RESULT") ?? [];

  const handleSessionStatusChange = async (value: string) => {
    if (!booking) return;
    setSessionStatusSaving(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionStatus: value }),
      });
      if (!res.ok) throw new Error("Failed");
      setSessionStatus(value);
      setBooking((prev) => (prev ? { ...prev, sessionStatus: value } : null));
      toast({ title: tCommon("save"), description: "" });
    } catch {
      toast({ title: tCommon("save"), variant: "destructive", description: "Failed to update status." });
    } finally {
      setSessionStatusSaving(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking || !uploadName.trim() || !uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("name", uploadName.trim());
      formData.set("file", uploadFile);
      formData.set("type", "SESSION_RESULT");
      const res = await fetch(`/api/bookings/${id}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Upload failed");
      }
      const attachment = await res.json();
      setBooking((prev) =>
        prev
          ? { ...prev, attachments: [...(prev.attachments ?? []), attachment] }
          : null
      );
      setUploadName("");
      setUploadFile(null);
      toast({ title: "Uploaded", description: attachment.name });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleNotify = async () => {
    if (!booking || !resultsPassword.trim()) {
      toast({
        variant: "destructive",
        title: t("notifyError"),
        description: "Set a results password first.",
      });
      return;
    }
    if (sessionResults.length === 0) {
      toast({
        variant: "destructive",
        title: t("notifyError"),
        description: "Upload at least one session result first.",
      });
      return;
    }
    setNotifyLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}/notify-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resultsPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setBooking((prev) =>
        prev ? { ...prev, resultsNotifiedAt: new Date().toISOString(), sessionStatus: "COMPLETED" } : null
      );
      setSessionStatus("COMPLETED");
      toast({ title: t("notifySuccess") });
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("notifyError"),
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setNotifyLoading(false);
    }
  };

  if (loading || !booking) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{tCommon("loading")}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <Link
        href="/team/bookings"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        {t("assignedBookings")}
      </Link>
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">{booking.package.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {new Date(booking.startAt).toLocaleString(undefined, {
              dateStyle: "full",
              timeStyle: "short",
            })}{" "}
            · {booking.durationMinutes} {tCommon("min")} ·{" "}
            {tBookings(`status.${booking.status}` as `status.${string}`) ?? booking.status}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-medium">Customer: {booking.customer.name}</p>
          <p className="text-sm">Email: {booking.customer.email}</p>
          {booking.customer.phone && (
            <p className="text-sm">Phone: {booking.customer.phone}</p>
          )}
          {booking.location && (
            <p className="text-sm">
              {tBookings("locationLabel")}: {booking.location}
            </p>
          )}
          {booking.notes && (
            <p className="text-sm text-muted-foreground">Notes: {booking.notes}</p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              downloadICS({
                title: `${booking.package.name} – ${booking.customer.name}`,
                startAt: booking.startAt,
                durationMinutes: booking.durationMinutes,
                location: booking.location,
                description: booking.notes
                  ? `Customer: ${booking.customer.name}. ${booking.notes}`
                  : `Customer: ${booking.customer.name}`,
              })
            }
          >
            <CalendarPlus className="h-4 w-4 mr-2" />
            {t("addToCalendar")}
          </Button>

          <hr className="border-border" />

          <div className="space-y-2">
            <Label>{t("sessionStatus")}</Label>
            <p className="text-xs text-muted-foreground">{t("sessionStatusHelp")}</p>
            <Select
              value={sessionStatus}
              onValueChange={handleSessionStatusChange}
              disabled={sessionStatusSaving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SESSION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {tBookings(`sessionStatus.${s}` as `sessionStatus.${string}`) ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("uploadSessionResults")}</Label>
            <p className="text-xs text-muted-foreground">{t("uploadSessionResultsHelp")}</p>
            {sessionResults.length > 0 && (
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                {sessionResults.map((a) => (
                  <li key={a.id}>{a.name}</li>
                ))}
              </ul>
            )}
            {sessionResults.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("noResultsUploaded")}</p>
            )}
            <form onSubmit={handleUpload} className="flex flex-wrap gap-2 items-end">
              <div className="space-y-1">
                <Label htmlFor="result-name" className="text-xs">
                  {t("resultName")}
                </Label>
                <Input
                  id="result-name"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g. Photo set 1"
                  className="w-40"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="result-file" className="text-xs">
                  File
                </Label>
                <Input
                  id="result-file"
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  className="w-40"
                />
              </div>
              <Button type="submit" size="sm" disabled={uploading || !uploadName.trim() || !uploadFile}>
                <Upload className="h-4 w-4 mr-1" />
                {t("addResult")}
              </Button>
            </form>
          </div>

          <div className="space-y-2">
            <Label htmlFor="results-password">{t("resultsPassword")}</Label>
            <p className="text-xs text-muted-foreground">{t("resultsPasswordHelp")}</p>
            <Input
              id="results-password"
              type="text"
              value={resultsPassword}
              onChange={(e) => setResultsPassword(e.target.value)}
              placeholder="Password for customer to view results"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t("notifyCustomerHelp")}</p>
            <Button
              onClick={handleNotify}
              disabled={notifyLoading || !resultsPassword.trim() || sessionResults.length === 0}
            >
              {notifyLoading ? "…" : t("allUploadedNotifyCustomer")}
            </Button>
            {booking.resultsNotifiedAt && (
              <p className="text-sm text-green-600 dark:text-green-400">
                Customer notified on {new Date(booking.resultsNotifiedAt).toLocaleString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

