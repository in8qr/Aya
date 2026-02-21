"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/fetch-safe";
import { AnimateInView } from "@/components/ui/animate-in-view";

type PortfolioItem = {
  id: string;
  category: string;
  tags: string[];
  imageUrl: string;
  sortOrder: number;
  visible: boolean;
};

export default function PortfolioPage() {
  const t = useTranslations("portfolio");
  const tCommon = useTranslations("common");
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    fetchJson<PortfolioItem[]>(`/api/portfolio?${params}`)
      .then((result) => {
        if (result.ok) {
          setItems(Array.isArray(result.data) ? result.data : []);
        } else {
          setError(result.error);
          setItems([]);
        }
      })
      .finally(() => setLoading(false));
  }, [category]);

  const categories = Array.from(new Set(items.map((i) => i.category))).sort();

  return (
    <div className="container mx-auto px-3 sm:px-4 max-w-6xl py-10 sm:py-14 md:py-16">
      <AnimateInView animation="fade-in-up">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight mb-6 sm:mb-8">{t("title")}</h1>
      </AnimateInView>
      {categories.length > 0 && (
        <div className="flex gap-2 mb-6 sm:mb-8 flex-wrap">
          <button
            onClick={() => setCategory(null)}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              !category ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
            )}
          >
            {tCommon("all")}
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                category === c ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      {loading ? (
        <p className="text-muted-foreground">{t("loading")}</p>
      ) : error ? (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          <p className="font-medium">{t("errorTitle")}</p>
          <p className="mt-1">{error}</p>
          <p className="mt-2 text-muted-foreground">{t("errorHint")}</p>
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">{t("noPhotos")}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          {items.map((item, i) => (
            <AnimateInView key={item.id} animation="fade-in-up" delay={i * 60}>
              <div className="rounded-lg overflow-hidden border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <div className="aspect-[4/3] relative">
                <Image
                  src={item.imageUrl}
                  alt={item.category}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="p-3">
                <p className="font-medium">{item.category}</p>
                {item.tags.length > 0 && (
                  <p className="text-sm text-muted-foreground">{item.tags.join(", ")}</p>
                )}
              </div>
            </div>
            </AnimateInView>
          ))}
        </div>
      )}
    </div>
  );
}
