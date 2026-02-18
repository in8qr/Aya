"use client";

import { useEffect } from "react";

export function LocaleAttributes({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale === "ar" ? "ar" : "en";
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);
  return null;
}
