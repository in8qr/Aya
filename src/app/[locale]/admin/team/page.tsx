"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  active: boolean;
  role: "ADMIN" | "TEAM";
};

export default function AdminTeamPage() {
  const t = useTranslations("admin");
  const tTeam = useTranslations("adminTeam");
  const tCommon = useTranslations("common");
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/team").then((r) => r.json()).then(setTeam).finally(() => setLoading(false));
  }, []);

  async function create(name: string, email: string, phone: string, password: string, role: "ADMIN" | "TEAM") {
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone: phone || undefined, password, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: "Error", description: data.error ?? "Failed", variant: "destructive" });
      return;
    }
    setTeam((prev) => [...prev, data]);
    setOpen(false);
    toast({ title: role === "ADMIN" ? tTeam("adminAdded") : tTeam("teamMemberAdded") });
  }

  async function update(id: string, updates: Partial<TeamMember> & { password?: string }) {
    const { password, ...rest } = updates;
    const body = password ? { ...rest, password } : rest;
    const res = await fetch(`/api/team/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: "Error", description: data.error ?? "Failed", variant: "destructive" });
      return;
    }
    setTeam((prev) => prev.map((t) => (t.id === id ? data : t)));
    setEditing(null);
    toast({ title: "Updated" });
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="font-display text-3xl font-medium tracking-tight">{t("team")}</h1>
        <Button onClick={() => setOpen(true)}>{tTeam("addUser")}</Button>
      </div>
      {loading ? (
        <p className="text-muted-foreground">{tCommon("loading")}</p>
      ) : (
        <div className="space-y-2">
          {team.map((member) => (
            <Card key={member.id} className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-base">{member.name} · {member.email}</CardTitle>
                <div className="flex gap-2 items-center">
                  <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{member.role === "ADMIN" ? tTeam("roleAdmin") : tTeam("roleTeam")}</span>
                  <span className={`text-sm ${member.active ? "text-green-600" : "text-muted-foreground"}`}>{member.active ? tCommon("active") : tCommon("inactive")}</span>
                  <Button variant="outline" size="sm" onClick={() => setEditing(member)}>{tCommon("edit")}</Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tTeam("addUser")}</DialogTitle>
          </DialogHeader>
          <TeamMemberForm onSubmit={create} onCancel={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tCommon("edit")}</DialogTitle>
          </DialogHeader>
          {editing && <TeamMemberEditForm initial={editing} onSave={(updates) => update(editing.id, updates)} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TeamMemberForm({ onSubmit, onCancel }: { onSubmit: (name: string, email: string, phone: string, password: string, role: "ADMIN" | "TEAM") => void; onCancel: () => void }) {
  const t = useTranslations("auth");
  const tTeam = useTranslations("adminTeam");
  const tCommon = useTranslations("common");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "TEAM">("TEAM");
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(name, email, phone, password, role); }}>
      <div><Label>{t("name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1" /></div>
      <div><Label>{t("email")}</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" /></div>
      <div><Label>{t("phoneOptional")}</Label><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" /></div>
      <div><Label>{tTeam("role")}</Label>
        <select value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "TEAM")} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
          <option value="TEAM">{tTeam("roleTeam")}</option>
          <option value="ADMIN">{tTeam("roleAdmin")}</option>
        </select>
      </div>
      <div><Label>{t("password")}</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="mt-1" /></div>
      <div className="flex gap-2"><Button type="submit">{tCommon("submit")}</Button><Button type="button" variant="outline" onClick={onCancel}>{tCommon("cancel")}</Button></div>
    </form>
  );
}

function TeamMemberEditForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: TeamMember;
  onSave: (updates: Partial<TeamMember> & { password?: string }) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("auth");
  const tTeam = useTranslations("adminTeam");
  const tCommon = useTranslations("common");
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [password, setPassword] = useState("");
  const [active, setActive] = useState(initial.active);
  const [role, setRole] = useState<"ADMIN" | "TEAM">(initial.role);
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSave({ name, email, phone: phone || null, active, role, ...(password ? { password } : {}) }); }}>
      <div><Label>{t("name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1" /></div>
      <div><Label>{t("email")}</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" /></div>
      <div><Label>{t("phoneOptional")}</Label><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" /></div>
      <div><Label>{tTeam("role")}</Label>
        <select value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "TEAM")} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
          <option value="TEAM">{tTeam("roleTeam")}</option>
          <option value="ADMIN">{tTeam("roleAdmin")}</option>
        </select>
      </div>
      <div><Label>{tTeam("newPasswordOptional")}</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" /></div>
      <div className="flex items-center gap-2"><input type="checkbox" id="active" checked={active} onChange={(e) => setActive(e.target.checked)} /><Label htmlFor="active">{tCommon("active")}</Label></div>
      <div className="flex gap-2"><Button type="submit">{tCommon("save")}</Button><Button type="button" variant="outline" onClick={onCancel}>{tCommon("cancel")}</Button></div>
    </form>
  );
}
