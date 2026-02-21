"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

type Package = {
  id: string;
  name: string;
  nameAr: string | null;
  priceDisplay: string;
  durationMinutes: number;
  description: string | null;
  descriptionAr: string | null;
  deliverables: string | null;
  deliverablesAr: string | null;
  visible: boolean;
  sortOrder: number;
};

export default function AdminPackagesPage() {
  const t = useTranslations("admin");
  const tPkg = useTranslations("adminPackages");
  const tCommon = useTranslations("common");
  const [packages, setPackages] = useState<Package[]>([]);
  const [editing, setEditing] = useState<Package | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/packages")
      .then((r) => r.json())
      .then((data) => setPackages(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  async function save(pkg: Partial<Package> & { name: string; priceDisplay: string; durationMinutes: number }) {
    const body = {
      ...pkg,
      nameAr: (pkg.nameAr?.trim()) || null,
      descriptionAr: (pkg.descriptionAr?.trim()) || null,
      deliverablesAr: (pkg.deliverablesAr?.trim()) || null,
      visible: pkg.visible ?? true,
    };
    const url = editing ? `/api/packages/${editing.id}` : "/api/packages";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json();
      toast({ title: tPkg("toastError"), description: data.error ?? tPkg("toastFailedSave"), variant: "destructive" });
      return;
    }
    const saved = await res.json();
    if (editing) {
      setPackages((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
    } else {
      setPackages((prev) => [...prev, saved]);
    }
    setOpen(false);
    setEditing(null);
    toast({ title: tPkg("toastSaved") });
  }

  async function remove(id: string) {
    if (!confirm(tPkg("deleteConfirm"))) return;
    const res = await fetch(`/api/packages/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: tPkg("toastError"), description: tPkg("toastFailedDelete"), variant: "destructive" });
      return;
    }
    setPackages((prev) => prev.filter((p) => p.id !== id));
    toast({ title: tPkg("toastDeleted") });
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="font-display text-3xl font-medium tracking-tight">{t("packages")}</h1>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>{tPkg("addPackage")}</Button>
      </div>
      {loading ? (
        <p className="text-muted-foreground">{tCommon("loading")}</p>
      ) : (
        <div className="space-y-2">
          {packages.map((p) => (
            <Card key={p.id} className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-base">
                  {p.name}{p.nameAr ? ` | ${p.nameAr}` : ""} · {p.priceDisplay}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(p); setOpen(true); }}>{tPkg("edit")}</Button>
                  <Button variant="destructive" size="sm" onClick={() => remove(p.id)}>{tPkg("delete")}</Button>
                </div>
              </CardHeader>
              <CardContent className="py-0 pb-3 text-sm text-muted-foreground">
                {p.durationMinutes >= 60 ? `${p.durationMinutes / 60} ${tCommon("hour")}` : `${p.durationMinutes} ${tCommon("min")}`} · {p.visible ? tPkg("visible") : tPkg("hidden")}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? tPkg("editPackage") : tPkg("newPackage")}</DialogTitle>
          </DialogHeader>
          <PackageForm key={editing?.id ?? "new"} initial={editing ?? undefined} onSave={save} onCancel={() => { setOpen(false); setEditing(null); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PackageForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Package;
  onSave: (p: Partial<Package> & { name: string; priceDisplay: string; durationMinutes: number }) => void;
  onCancel: () => void;
}) {
  const tCommon = useTranslations("common");
  const tPkg = useTranslations("adminPackages");
  const [name, setName] = useState(initial?.name ?? "");
  const [nameAr, setNameAr] = useState(initial?.nameAr ?? "");
  const [priceDisplay, setPriceDisplay] = useState(initial?.priceDisplay ?? "");
  const [durationHours, setDurationHours] = useState(initial?.durationMinutes != null ? initial.durationMinutes / 60 : 1);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [descriptionAr, setDescriptionAr] = useState(initial?.descriptionAr ?? "");
  const [deliverables, setDeliverables] = useState(initial?.deliverables ?? "");
  const [deliverablesAr, setDeliverablesAr] = useState(initial?.deliverablesAr ?? "");
  const [visible, setVisible] = useState(initial?.visible !== false);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          name,
          nameAr: nameAr || undefined,
          priceDisplay,
          durationMinutes: Math.round(durationHours * 60),
          description: description || undefined,
          descriptionAr: descriptionAr || undefined,
          deliverables: deliverables || undefined,
          deliverablesAr: deliverablesAr || undefined,
          visible,
        });
      }}
    >
      <div className="border-b border-border pb-3">
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">English</p>
        <div className="space-y-3">
          <div>
            <Label>{tPkg("name")} (EN)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label>{tPkg("description")} (EN)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>{tPkg("deliverables")} (EN)</Label>
            <Textarea value={deliverables} onChange={(e) => setDeliverables(e.target.value)} className="mt-1" />
          </div>
        </div>
      </div>
      <div className="border-b border-border pb-3">
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">العربية (Arabic)</p>
        <div className="space-y-3">
          <div>
            <Label>{tPkg("name")} (AR)</Label>
            <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="mt-1" dir="rtl" />
          </div>
          <div>
            <Label>{tPkg("description")} (AR)</Label>
            <Textarea value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} className="mt-1" dir="rtl" />
          </div>
          <div>
            <Label>{tPkg("deliverables")} (AR)</Label>
            <Textarea value={deliverablesAr} onChange={(e) => setDeliverablesAr(e.target.value)} className="mt-1" dir="rtl" />
          </div>
        </div>
      </div>
      <div>
        <Label>{tPkg("priceDisplay")}</Label>
        <Input value={priceDisplay} onChange={(e) => setPriceDisplay(e.target.value)} placeholder={tPkg("pricePlaceholder")} required className="mt-1" />
      </div>
      <div>
        <Label>{tPkg("durationHours")}</Label>
        <Input type="number" min={0.5} step={0.5} value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value))} className="mt-1" placeholder={tPkg("durationPlaceholder")} />
        <p className="text-xs text-muted-foreground mt-1">{tPkg("durationHint")}</p>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="visible" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
        <Label htmlFor="visible">{tPkg("visibleOnSite")}</Label>
      </div>
      <div className="flex gap-2">
        <Button type="submit">{tCommon("save")}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>{tCommon("cancel")}</Button>
      </div>
    </form>
  );
}
