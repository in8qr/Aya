"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { fetchJson, isFetchError } from "@/lib/fetch-safe";

type SiteValues = { emailFrom: string; contactEmail: string | null; appUrl: string };
type Keys = Record<string, { label: string; placeholder: string }>;

export default function AdminSettingsPage() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<SiteValues>({
    emailFrom: "",
    contactEmail: "",
    appUrl: "",
  });
  const [keys, setKeys] = useState<Keys>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchJson<{ keys: Keys; values: SiteValues }>("/api/settings/site")
      .then((r) => {
        if (r.ok && r.data) {
          setKeys(r.data.keys ?? {});
          setValues({
            emailFrom: r.data.values?.emailFrom ?? "",
            contactEmail: r.data.values?.contactEmail ?? "",
            appUrl: r.data.values?.appUrl ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await fetchJson<{ values: SiteValues }>("/api/settings/site", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailFrom: values.emailFrom.trim() || undefined,
        contactEmail: values.contactEmail?.trim() || null,
        appUrl: values.appUrl.trim() || null,
      }),
    });
    setSaving(false);
    if (isFetchError(result)) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }
    if (result.data?.values) setValues(result.data.values);
    toast({ title: t("settingsSaved") });
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="font-display">{t("settings")}</CardTitle>
          <CardDescription>{t("settingsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="emailFrom">{keys.emailFrom?.label ?? "Email From"}</Label>
              <Input
                id="emailFrom"
                type="text"
                value={values.emailFrom}
                onChange={(e) => setValues((v) => ({ ...v, emailFrom: e.target.value }))}
                placeholder={keys.emailFrom?.placeholder ?? "Aya Eye <noreply@yoursite.com>"}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Sender for verification and booking emails. Leave empty to use the server environment value.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">{keys.contactEmail?.label ?? "Contact Email"}</Label>
              <Input
                id="contactEmail"
                type="email"
                value={values.contactEmail ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, contactEmail: e.target.value || null }))}
                placeholder={keys.contactEmail?.placeholder ?? "hello@yoursite.com"}
              />
              <p className="text-xs text-muted-foreground">
                Optional. For contact page or footer. Leave empty to hide or use env.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appUrl">{keys.appUrl?.label ?? "Site URL"}</Label>
              <Input
                id="appUrl"
                type="url"
                value={values.appUrl}
                onChange={(e) => setValues((v) => ({ ...v, appUrl: e.target.value }))}
                placeholder={keys.appUrl?.placeholder ?? "https://aya.example.com"}
              />
              <p className="text-xs text-muted-foreground">
                Used in email links. Leave empty to use NEXT_PUBLIC_APP_URL.
              </p>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : tCommon("save")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
