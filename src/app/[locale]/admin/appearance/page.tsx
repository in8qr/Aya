"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { fetchJson } from "@/lib/fetch-safe";

const FALLBACK_HERO =
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1920&q=80";

export default function AdminAppearancePage() {
  const t = useTranslations("admin");
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchJson<{ url: string | null }>("/api/settings/hero-image")
      .then((r) => {
        if (r.ok && r.data?.url !== undefined) setHeroUrl(r.data.url);
      })
      .finally(() => setLoading(false));
  }, []);

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
    </div>
  );
}
