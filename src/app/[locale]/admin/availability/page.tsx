"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput, TimeInput, DateTimeInput } from "@/components/ui/date-time-inputs";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

type DayBlock = { id: string; day: string; fullDay: boolean; startAt: string | null; endAt: string | null; reason: string | null };
type CapacityOverride = { id: string; day: string; capacity: number; reason: string | null };
type TeamUnavailable = { id: string; teamUserId: string; startAt: string; endAt: string; reason: string | null; teamUser: { name: string } };
type TeamMember = { id: string; name: string };

export default function AdminAvailabilityPage() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [blocks, setBlocks] = useState<DayBlock[]>([]);
  const [overrides, setOverrides] = useState<CapacityOverride[]>([]);
  const [unavailables, setUnavailables] = useState<TeamUnavailable[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/availability/day-blocks").then((r) => r.json()),
      fetch("/api/availability/capacity-overrides").then((r) => r.json()),
      fetch("/api/availability/team-unavailable").then((r) => r.json()),
      fetch("/api/team").then((r) => r.json()),
    ])
      .then(([b, o, u, tData]) => {
        setBlocks(b);
        setOverrides(o);
        setUnavailables(u);
        setTeam(tData);
      })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function addBlock(day: string, fullDay: boolean, startAt: string, endAt: string, reason: string) {
    const res = await fetch("/api/availability/day-blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        day: new Date(day).toISOString(),
        fullDay,
        startAt: fullDay ? null : new Date(`${day}T${startAt}`).toISOString(),
        endAt: fullDay ? null : new Date(`${day}T${endAt}`).toISOString(),
        reason: reason || null,
      }),
    });
    if (!res.ok) { toast({ title: "Error", description: "Failed to add block", variant: "destructive" }); return; }
    const created = await res.json();
    setBlocks((prev) => [...prev, created]);
    toast({ title: "Block added" });
  }
  async function removeBlock(id: string) {
    await fetch(`/api/availability/day-blocks/${id}`, { method: "DELETE" });
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    toast({ title: "Block removed" });
  }
  async function setOverride(day: string, capacity: number, reason: string) {
    const res = await fetch("/api/availability/capacity-overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day: new Date(day).toISOString(), capacity, reason: reason || null }),
    });
    if (!res.ok) { toast({ title: "Error", description: "Failed to set override", variant: "destructive" }); return; }
    const updated = await res.json();
    setOverrides((prev) => prev.filter((o) => o.day !== day).concat([updated]));
    toast({ title: "Override set" });
  }
  async function removeOverride(day: string) {
    await fetch(`/api/availability/capacity-overrides/${encodeURIComponent(day)}`, { method: "DELETE" });
    setOverrides((prev) => prev.filter((o) => o.day !== day));
    toast({ title: "Override removed" });
  }
  async function addUnavailable(teamUserId: string, startAt: string, endAt: string, reason: string) {
    const res = await fetch("/api/availability/team-unavailable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamUserId, startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString(), reason: reason || null }),
    });
    if (!res.ok) { toast({ title: "Error", description: "Failed to add", variant: "destructive" }); return; }
    const created = await res.json();
    setUnavailables((prev) => [...prev, created]);
    toast({ title: "Unavailability added" });
  }
  async function removeUnavailable(id: string) {
    await fetch(`/api/availability/team-unavailable/${id}`, { method: "DELETE" });
    setUnavailables((prev) => prev.filter((u) => u.id !== id));
    toast({ title: "Removed" });
  }

  if (loading) return <div className="p-6">{tCommon("loading")}</div>;

  return (
    <div className="p-6 space-y-8">
      <h1 className="font-display text-3xl font-medium tracking-tight">{t("availability")}</h1>
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>{t("blockedDays")}</CardTitle>
          <CardDescription>{t("blockedDaysDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddBlockForm onSubmit={addBlock} />
          <ul className="space-y-1">
            {blocks.map((b) => (
              <li key={b.id} className="flex justify-between items-center text-sm">
                <span>{new Date(b.day).toLocaleDateString()}{b.fullDay ? " (full day)" : ` ${b.startAt}–${b.endAt}`}{b.reason && ` — ${b.reason}`}</span>
                <Button variant="ghost" size="sm" onClick={() => removeBlock(b.id)}>Remove</Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>{t("capacityOverrides")}</CardTitle>
          <CardDescription>{t("capacityOverridesDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddOverrideForm onSet={setOverride} onRemove={removeOverride} existing={overrides} />
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>{t("teamUnavailability")}</CardTitle>
          <CardDescription>{t("teamUnavailabilityDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddUnavailableForm team={team} onSubmit={addUnavailable} />
          <ul className="space-y-1">
            {unavailables.map((u) => (
              <li key={u.id} className="flex justify-between items-center text-sm">
                <span>{u.teamUser.name}: {new Date(u.startAt).toLocaleString()} – {new Date(u.endAt).toLocaleString()}{u.reason && ` — ${u.reason}`}</span>
                <Button variant="ghost" size="sm" onClick={() => removeUnavailable(u.id)}>Remove</Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function AddBlockForm({ onSubmit }: { onSubmit: (day: string, fullDay: boolean, startAt: string, endAt: string, reason: string) => void }) {
  const [day, setDay] = useState("");
  const [fullDay, setFullDay] = useState(true);
  const [startAt, setStartAt] = useState("09:00");
  const [endAt, setEndAt] = useState("17:00");
  const [reason, setReason] = useState("");
  return (
    <form className="flex flex-wrap gap-2 items-end" onSubmit={(e) => { e.preventDefault(); onSubmit(day, fullDay, startAt, endAt, reason); }}>
      <div><Label>Day</Label><DateInput value={day} onChange={(e) => setDay(e.target.value)} required className="mt-1" /></div>
      <div className="flex items-center gap-2"><input type="checkbox" id="fullDay" checked={fullDay} onChange={(e) => setFullDay(e.target.checked)} /><Label htmlFor="fullDay">Full day</Label></div>
      {!fullDay && (<><div><Label>From</Label><TimeInput value={startAt} onChange={(e) => setStartAt(e.target.value)} className="mt-1" /></div><div><Label>To</Label><TimeInput value={endAt} onChange={(e) => setEndAt(e.target.value)} className="mt-1" /></div></>)}
      <div><Label>Reason (optional)</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Holiday" className="mt-1" /></div>
      <Button type="submit">Add block</Button>
    </form>
  );
}

function AddOverrideForm({ onSet, onRemove, existing }: { onSet: (day: string, capacity: number, reason: string) => void; onRemove: (day: string) => void; existing: CapacityOverride[] }) {
  const [day, setDay] = useState("");
  const [capacity, setCapacity] = useState(1);
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-2">
      <form className="flex flex-wrap gap-2 items-end" onSubmit={(e) => { e.preventDefault(); onSet(day, capacity, reason); }}>
        <div><Label>Day</Label><DateInput value={day} onChange={(e) => setDay(e.target.value)} required className="mt-1" /></div>
        <div><Label>Capacity</Label><Input type="number" min={0} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="mt-1 w-20" /></div>
        <div><Label>Reason (optional)</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1" /></div>
        <Button type="submit">Set override</Button>
      </form>
      {existing.length > 0 && (
        <ul className="text-sm">
          {existing.map((o) => (
            <li key={o.id} className="flex justify-between">
              {new Date(o.day).toLocaleDateString()} → {o.capacity}
              <Button variant="ghost" size="sm" onClick={() => onRemove(o.day)}>Remove</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddUnavailableForm({ team, onSubmit }: { team: TeamMember[]; onSubmit: (teamUserId: string, startAt: string, endAt: string, reason: string) => void }) {
  const [teamUserId, setTeamUserId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [reason, setReason] = useState("");
  return (
    <form className="flex flex-wrap gap-2 items-end" onSubmit={(e) => { e.preventDefault(); onSubmit(teamUserId, startAt, endAt, reason); }}>
      <div><Label>Team member</Label><Select value={teamUserId} onValueChange={setTeamUserId} required><SelectTrigger className="mt-1 w-40"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{team.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent></Select></div>
      <div><Label>From</Label><DateTimeInput value={startAt} onChange={(e) => setStartAt(e.target.value)} required className="mt-1" /></div>
      <div><Label>To</Label><DateTimeInput value={endAt} onChange={(e) => setEndAt(e.target.value)} required className="mt-1" /></div>
      <div><Label>Reason (optional)</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1" /></div>
      <Button type="submit">Add</Button>
    </form>
  );
}
