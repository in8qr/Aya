"use client";

import { AdminCalendar } from "@/components/admin/calendar";
import { useTranslations } from "next-intl";

export default function TeamCalendarPage() {
  const t = useTranslations("team");
  return (
    <div className="p-6">
      <h1 className="font-display text-3xl font-medium tracking-tight mb-4">{t("myBookings")}</h1>
      <AdminCalendar teamOnly={true} />
    </div>
  );
}
