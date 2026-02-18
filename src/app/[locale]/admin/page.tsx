"use client";

import { AdminCalendar } from "@/components/admin/calendar";
import { useTranslations } from "next-intl";

export default function AdminCalendarPage() {
  const t = useTranslations("admin");
  return (
    <div className="p-6">
      <h1 className="font-display text-3xl font-medium tracking-tight mb-4">{t("calendar")}</h1>
      <AdminCalendar teamOnly={false} />
    </div>
  );
}
