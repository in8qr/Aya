"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { fetchJson, isFetchError } from "@/lib/fetch-safe";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";

const FALLBACK_HERO =
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1920&q=80";

type CarouselSlide = { id: string; imageUrl: string; caption: string | null; sortOrder: number };

export default function AdminAppearancePage() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>([]);
  const [carouselLoading, setCarouselLoading] = useState(true);
  const [addSlideUrl, setAddSlideUrl] = useState("");
  const [addSlideCaption, setAddSlideCaption] = useState("");
  const [addSlideUploading, setAddSlideUploading] = useState(false);
  const [addSlideSaving, setAddSlideSaving] = useState(false);
  const [captionDrafts, setCaptionDrafts] = useState<Record<string, string>>({});
  const carouselFileRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const loadCarousel = useCallback(() => {
    fetchJson<CarouselSlide[]>("/api/carousel")
      .then((r) => {
        if (r.ok && Array.isArray(r.data)) setCarouselSlides(r.data);
      })
      .finally(() => setCarouselLoading(false));
  }, []);

  useEffect(() => {
    fetchJson<{ url: string | null }>("/api/settings/hero-image")
      .then((r) => {
        if (r.ok && r.data?.url !== undefined) setHeroUrl(r.data.url);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCarousel();
  }, [loadCarousel]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.set("file", file);
    const result = await fetchJson<{ url: string }>("/api/settings/hero-image/upload", {
      method: "POST",
      body: form,
    });
    setUploading(false);
    e.target.value = "";
    if (!result.ok) {
      toast({ title: "Upload failed", description: result.error, variant: "destructive" });
      return;
    }
    if (result.data?.url) {
      setHeroUrl(result.data.url);
      toast({ title: t("imageSaved") });
    }
  }

  async function handleSetUrl() {
    const url = urlInput.trim();
    if (!url) return;
    setSaving(true);
    const result = await fetchJson<{ url: string | null }>("/api/settings/hero-image", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    setSaving(false);
    if (!result.ok) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }
    setHeroUrl(url);
    setUrlInput("");
    toast({ title: t("imageSaved") });
  }

  async function handleRemove() {
    setSaving(true);
    const result = await fetchJson<{ url: null }>("/api/settings/hero-image", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: null }),
    });
    setSaving(false);
    if (!result.ok) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }
    setHeroUrl(null);
    toast({ title: t("imageRemoved") });
  }

  async function addSlideByUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAddSlideUploading(true);
    const form = new FormData();
    form.set("file", file);
    const result = await fetchJson<{ url: string }>("/api/carousel/upload", { method: "POST", body: form });
    setAddSlideUploading(false);
    e.target.value = "";
    if (!result.ok) {
      toast({ title: "Upload failed", description: result.error, variant: "destructive" });
      return;
    }
    if (result.data?.url) {
      const createRes = await fetchJson<CarouselSlide>("/api/carousel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: result.data.url, caption: addSlideCaption.trim() || undefined }),
      });
      if (isFetchError(createRes)) {
        toast({ title: "Error", description: createRes.error, variant: "destructive" });
      } else if (createRes.data) {
        setCarouselSlides((prev) => [...prev, createRes.data].sort((a, b) => a.sortOrder - b.sortOrder));
        setAddSlideCaption("");
        toast({ title: t("imageSaved") });
      }
    }
  }

  async function addSlideByUrl() {
    const url = addSlideUrl.trim();
    if (!url) return;
    setAddSlideSaving(true);
    const result = await fetchJson<CarouselSlide>("/api/carousel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: url, caption: addSlideCaption.trim() || undefined }),
    });
    setAddSlideSaving(false);
    if (!result.ok) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }
    if (result.data) {
      setCarouselSlides((prev) => [...prev, result.data!].sort((a, b) => a.sortOrder - b.sortOrder));
      setAddSlideUrl("");
      setAddSlideCaption("");
      toast({ title: t("imageSaved") });
    }
  }

  async function updateSlideCaption(id: string, caption: string) {
    const result = await fetchJson<CarouselSlide>(`/api/carousel/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: caption || null }),
    });
    if (result.ok && result.data) {
      setCarouselSlides((prev) => prev.map((s) => (s.id === id ? result.data! : s)));
    }
  }

  async function moveSlide(index: number, direction: -1 | 1) {
    const newOrder = [...carouselSlides];
    const swap = index + direction;
    if (swap < 0 || swap >= newOrder.length) return;
    [newOrder[index], newOrder[swap]] = [newOrder[swap], newOrder[index]];
    const orderedIds = newOrder.map((s) => s.id);
    const result = await fetchJson<{ ok: boolean }>("/api/carousel/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    });
    if (result.ok) {
      setCarouselSlides(newOrder.map((s, i) => ({ ...s, sortOrder: i })));
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  }

  async function removeSlide(id: string) {
    const result = await fetchJson<{ ok: boolean }>(`/api/carousel/${id}`, { method: "DELETE" });
    if (result.ok) {
      setCarouselSlides((prev) => prev.filter((s) => s.id !== id));
      toast({ title: t("imageRemoved") });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const displayUrl = heroUrl || FALLBACK_HERO;

  return (
    <div className="p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="font-display">{t("heroImage")}</CardTitle>
          <CardDescription>{t("heroImageDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative aspect-[21/9] w-full rounded-md border border-border overflow-hidden bg-muted">
            <Image
              src={displayUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 672px"
            />
            {!heroUrl && (
              <span className="absolute bottom-2 left-2 text-xs text-white/80 bg-black/50 px-2 py-1 rounded">
                {t("defaultImage")}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("uploadImage")}</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : t("uploadImage")}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>{t("orSetUrl")}</Label>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder={t("setUrlPlaceholder")}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSetUrl} disabled={saving || !urlInput.trim()}>
                Save
              </Button>
            </div>
          </div>

          {heroUrl && (
            <Button type="button" variant="ghost" onClick={handleRemove} disabled={saving} className="text-muted-foreground">
              {t("removeImage")}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="font-display">{t("movingPhotos")}</CardTitle>
          <CardDescription>{t("movingPhotosDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {carouselLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : carouselSlides.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noCarouselSlides")}</p>
          ) : (
            <ul className="space-y-4">
              {carouselSlides.map((slide, index) => (
                <li
                  key={slide.id}
                  className="flex flex-col sm:flex-row gap-3 p-3 rounded-lg border border-border bg-muted/30"
                >
                  <div className="relative w-full sm:w-32 aspect-video shrink-0 rounded overflow-hidden bg-muted">
                    <Image
                      src={slide.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="128px"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <Input
                      placeholder={t("slideCaptionPlaceholder")}
                      value={captionDrafts[slide.id] ?? slide.caption ?? ""}
                      onChange={(e) => setCaptionDrafts((prev) => ({ ...prev, [slide.id]: e.target.value }))}
                      onBlur={(e) => {
                        const v = e.target.value;
                        updateSlideCaption(slide.id, v);
                        setCaptionDrafts((prev) => {
                          const next = { ...prev };
                          delete next[slide.id];
                          return next;
                        });
                      }}
                      className="text-sm"
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveSlide(index, -1)}
                        disabled={index === 0}
                        aria-label={t("moveUp")}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveSlide(index, 1)}
                        disabled={index === carouselSlides.length - 1}
                        aria-label={t("moveDown")}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeSlide(slide.id)}
                        aria-label={t("removeSlide")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-border pt-6 space-y-3">
            <p className="text-sm font-medium">{t("addSlide")}</p>
            <div className="flex flex-wrap gap-2">
              <input
                ref={carouselFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={addSlideByUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => carouselFileRef.current?.click()}
                disabled={addSlideUploading}
              >
                {addSlideUploading ? "Uploading…" : t("uploadImage")}
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="url"
                placeholder={t("setUrlPlaceholder")}
                value={addSlideUrl}
                onChange={(e) => setAddSlideUrl(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder={t("slideCaptionPlaceholder")}
                value={addSlideCaption}
                onChange={(e) => setAddSlideCaption(e.target.value)}
                className="sm:w-48"
              />
              <Button onClick={addSlideByUrl} disabled={addSlideSaving || !addSlideUrl.trim()}>
                {tCommon("save")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
