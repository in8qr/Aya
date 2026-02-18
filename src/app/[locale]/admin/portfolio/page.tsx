"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { fetchJson } from "@/lib/fetch-safe";

type PortfolioItem = {
  id: string;
  category: string;
  tags: string[];
  imageUrl: string;
  sortOrder: number;
  visible: boolean;
};

export default function AdminPortfolioPage() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchJson<PortfolioItem[]>("/api/portfolio")
      .then((r) => { if (r.ok) setItems(Array.isArray(r.data) ? r.data : []); })
      .finally(() => setLoading(false));
  }, []);

  async function handleFileUpload(file: File) {
    setUploading(true);
    const form = new FormData();
    form.set("file", file);
    const result = await fetchJson<{ url: string; key: string }>("/api/portfolio/upload", { method: "POST", body: form });
    setUploading(false);
    if (!result.ok) {
      toast({ title: "Upload failed", description: result.error, variant: "destructive" });
      return;
    }
    setNewImageUrl(result.data.url);
    toast({ title: "Image uploaded" });
  }

  async function addItem() {
    if (!newCategory.trim() || !newImageUrl) {
      toast({ title: "Category and image required", variant: "destructive" });
      return;
    }
    const tags = newTags.split(",").map((t) => t.trim()).filter(Boolean);
    const result = await fetchJson<PortfolioItem>("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: newCategory.trim(), tags, imageUrl: newImageUrl, visible: true }),
    });
    if (!result.ok) {
      toast({ title: "Error", description: result.error ?? "Failed to add", variant: "destructive" });
      return;
    }
    if (result.data) setItems((prev) => [...prev, result.data]);
    setOpen(false);
    setNewCategory("");
    setNewTags("");
    setNewImageUrl("");
    toast({ title: "Added" });
  }

  async function updateItem(id: string, updates: Partial<PortfolioItem>) {
    const result = await fetchJson<PortfolioItem>(`/api/portfolio/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!result.ok) {
      toast({ title: "Error", description: result.error ?? "Failed to update", variant: "destructive" });
      return;
    }
    if (result.data) setItems((prev) => prev.map((p) => (p.id === id ? result.data! : p)));
    toast({ title: "Updated" });
  }

  async function deleteItem(id: string) {
    if (!confirm("Remove this photo from the portfolio?")) return;
    const result = await fetchJson<unknown>(`/api/portfolio/${id}`, { method: "DELETE" });
    if (!result.ok) {
      toast({ title: "Error", description: result.error ?? "Failed to delete", variant: "destructive" });
      return;
    }
    setItems((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Deleted" });
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="font-display text-3xl font-medium tracking-tight">{t("portfolio")}</h1>
        <Button onClick={() => setOpen(true)}>Add photo</Button>
      </div>
      {loading ? (
        <p className="text-muted-foreground">{tCommon("loading")}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="border-border bg-card">
              <div className="aspect-[4/3] relative">
                <Image src={item.imageUrl} alt={item.category} fill className="object-cover" sizes="200px" />
              </div>
              <CardContent className="p-2">
                <p className="text-sm font-medium truncate">{item.category}</p>
                <div className="flex gap-1 mt-1">
                  <Button size="sm" variant="outline" onClick={() => updateItem(item.id, { visible: !item.visible })}>{item.visible ? "Hide" : "Show"}</Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteItem(item.id)}>{tCommon("delete")}</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Upload image</Label>
              <Input type="file" accept="image/*" className="mt-1" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
            </div>
            {newImageUrl && (
              <>
                <div>
                  <Label>Category</Label>
                  <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Weddings" className="mt-1" />
                </div>
                <div>
                  <Label>Tags (comma-separated)</Label>
                  <Input value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="outdoor, summer" className="mt-1" />
                </div>
                <Button onClick={addItem}>Add to portfolio</Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
