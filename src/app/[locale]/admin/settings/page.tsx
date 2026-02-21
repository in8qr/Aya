"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { fetchJson, isFetchError } from "@/lib/fetch-safe";

type SiteValues = {
  emailFrom: string;
  contactEmail: string | null;
  appUrl: string;
  smtpHost: string;
  smtpUser: string;
  smtpPassword: string;
  smtpPort: number;
  smtpSecure: boolean;
};
type Keys = Record<string, { label: string; placeholder: string }>;

const initialValues: SiteValues = {
  emailFrom: "",
  contactEmail: "",
  appUrl: "",
  smtpHost: "",
  smtpUser: "",
  smtpPassword: "",
  smtpPort: 587,
  smtpSecure: false,
};

export default function AdminSettingsPage() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<SiteValues>(initialValues);
  const [keys, setKeys] = useState<Keys>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchJson<{ keys: Keys; values: SiteValues }>("/api/settings/site")
      .then((r) => {
        if (r.ok && r.data) {
          setKeys(r.data.keys ?? {});
          const v = r.data.values;
          setValues({
            emailFrom: v?.emailFrom ?? "",
            contactEmail: v?.contactEmail ?? "",
            appUrl: v?.appUrl ?? "",
            smtpHost: v?.smtpHost ?? "",
            smtpUser: v?.smtpUser ?? "",
            smtpPassword: v?.smtpPassword === "********" ? "" : v?.smtpPassword ?? "",
            smtpPort: typeof v?.smtpPort === "number" ? v.smtpPort : Number(v?.smtpPort) || 587,
            smtpSecure: Boolean(v?.smtpSecure),
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body: Record<string, unknown> = {
      emailFrom: values.emailFrom.trim() || undefined,
      contactEmail: values.contactEmail?.trim() || null,
      appUrl: values.appUrl.trim() || null,
      smtpHost: values.smtpHost.trim() || undefined,
      smtpUser: values.smtpUser.trim() || undefined,
      smtpPort: values.smtpPort,
      smtpSecure: values.smtpSecure,
    };
    if (values.smtpPassword && values.smtpPassword !== "********") body.smtpPassword = values.smtpPassword;
    const result = await fetchJson<{ values: SiteValues }>("/api/settings/site", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (isFetchError(result)) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }
    if (result.data?.values) {
      const v = result.data.values;
      setValues({
        ...v,
        smtpPassword: v.smtpPassword === "********" ? "" : v.smtpPassword ?? "",
      });
    }
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

            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="font-medium text-sm">{t("settingsSmtpSection")}</h3>
              <div className="space-y-2">
                <Label htmlFor="smtpHost">{keys.smtpHost?.label ?? "SMTP Host"}</Label>
                <Input
                  id="smtpHost"
                  type="text"
                  value={values.smtpHost}
                  onChange={(e) => setValues((v) => ({ ...v, smtpHost: e.target.value }))}
                  placeholder={keys.smtpHost?.placeholder ?? "smtp.gmail.com"}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpUser">{keys.smtpUser?.label ?? "SMTP Email / Username"}</Label>
                <Input
                  id="smtpUser"
                  type="email"
                  value={values.smtpUser}
                  onChange={(e) => setValues((v) => ({ ...v, smtpUser: e.target.value }))}
                  placeholder={keys.smtpUser?.placeholder ?? "your@gmail.com"}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPassword">{keys.smtpPassword?.label ?? "SMTP Password"}</Label>
                <Input
                  id="smtpPassword"
                  type="password"
                  value={values.smtpPassword}
                  onChange={(e) => setValues((v) => ({ ...v, smtpPassword: e.target.value }))}
                  placeholder={keys.smtpPassword?.placeholder ?? "Leave blank to keep current"}
                  className="font-mono text-sm"
                  autoComplete="new-password"
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">{keys.smtpPort?.label ?? "SMTP Port"}</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    min={1}
                    max={65535}
                    value={values.smtpPort}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, smtpPort: Number(e.target.value) || 587 }))
                    }
                    placeholder="587"
                    className="w-24 font-mono"
                  />
                </div>
                <div className="flex items-center gap-2 pt-8">
                  <input
                    type="checkbox"
                    id="smtpSecure"
                    checked={values.smtpSecure}
                    onChange={(e) => setValues((v) => ({ ...v, smtpSecure: e.target.checked }))}
                    className="rounded border-border"
                  />
                  <Label htmlFor="smtpSecure" className="font-normal cursor-pointer">
                    {keys.smtpSecure?.label ?? "SMTP Secure (TLS)"}
                  </Label>
                </div>
              </div>
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
