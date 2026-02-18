"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type Booking = {
  id: string;
  startAt: string;
  durationMinutes: number;
  status: string;
  location: string | null;
  notes: string | null;
  customer: { name: string; email: string; phone: string | null };
  package: { name: string };
  assignedTeam: { id: string; name: string } | null;
  attachments: { id: string; name: string }[];
};

type TeamMember = { id: string; name: string; email: string };

export function BookingDetailsModal({
  bookingId,
  onClose,
}: {
  bookingId: string;
  onClose: () => void;
}) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch(`/api/bookings/${bookingId}`)
      .then((r) => r.json())
      .then(setBooking);
    fetch("/api/team")
      .then((r) => r.json())
      .then(setTeam);
  }, [bookingId]);

  async function handleAssign(assignedTeamId: string | null) {
    setAssigning(true);
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedTeamId }),
    });
    setAssigning(false);
    if (!res.ok) {
      const data = await res.json();
      toast({ title: "Error", description: data.error ?? "Failed to assign", variant: "destructive" });
      return;
    }
    const updated = await res.json();
    setBooking(updated);
    toast({ title: "Updated", description: assignedTeamId ? "Team member assigned." : "Assignment cleared." });
  }

  async function handleConfirm() {
    setConfirming(true);
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CONFIRMED" }),
    });
    setConfirming(false);
    if (!res.ok) {
      const data = await res.json();
      toast({ title: "Error", description: data.error ?? "Failed to confirm", variant: "destructive" });
      return;
    }
    const updated = await res.json();
    setBooking(updated);
    toast({ title: "Booking confirmed", description: "Customer will receive a confirmation email." });
  }

  async function handleReject() {
    if (!confirm("Reject this booking? The customer will receive a rejection email.")) return;
    setRejecting(true);
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REJECTED" }),
    });
    setRejecting(false);
    if (!res.ok) {
      const data = await res.json();
      toast({ title: "Error", description: data.error ?? "Failed to reject", variant: "destructive" });
      return;
    }
    const updated = await res.json();
    setBooking(updated);
    toast({ title: "Booking rejected" });
  }

  if (!booking) return <p className="text-muted-foreground">Loading…</p>;

  const canConfirm = booking.status === "PENDING_REVIEW" || booking.status === "ASSIGNED";
  const canReject = booking.status !== "REJECTED" && booking.status !== "CONFIRMED" && booking.status !== "COMPLETED";

  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium">{booking.package.name}</p>
        <p className="text-sm text-muted-foreground">
          {new Date(booking.startAt).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })} · {booking.durationMinutes} min
        </p>
      </div>
      <div>
        <p className="text-sm font-medium">Customer</p>
        <p className="text-sm">{booking.customer.name} · {booking.customer.email}</p>
        {booking.customer.phone && <p className="text-sm text-muted-foreground">{booking.customer.phone}</p>}
      </div>
      {booking.location && <p className="text-sm">Location: {booking.location}</p>}
      {booking.notes && <p className="text-sm text-muted-foreground">Notes: {booking.notes}</p>}
      <p className="text-sm">Status: <strong>{booking.status}</strong></p>

      <div>
        <Label>Assign to</Label>
        <Select
          value={booking.assignedTeam?.id ?? "__none__"}
          onValueChange={(v) => handleAssign(v === "__none__" ? null : v)}
          disabled={assigning}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select team member" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— None —</SelectItem>
            {team.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 pt-2">
        {canConfirm && (
          <Button onClick={handleConfirm} disabled={confirming}>
            Confirm booking
          </Button>
        )}
        {canReject && (
          <Button variant="destructive" onClick={handleReject} disabled={rejecting}>
            Reject
          </Button>
        )}
      </div>

      {booking.status === "CONFIRMED" && (
        <ReceiptUploadSection bookingId={bookingId} attachments={booking.attachments ?? []} onUploaded={() => {
          fetch(`/api/bookings/${bookingId}`).then((r) => r.json()).then(setBooking);
        }} />
      )}
    </div>
  );
}

function ReceiptUploadSection({
  bookingId,
  attachments,
  onUploaded,
}: {
  bookingId: string;
  attachments: { id: string; name: string }[];
  onUploaded: () => void;
}) {
  const [rows, setRows] = useState<Array<{ name: string; file: File | null }>>([
    { name: "", file: null },
  ]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  function addRow() {
    setRows((r) => [...r, { name: "", file: null }]);
  }

  async function uploadAll() {
    const toUpload = rows.filter((r) => r.name.trim() && r.file);
    if (toUpload.length === 0) {
      toast({ title: "Add at least one attachment with a name and file.", variant: "destructive" });
      return;
    }
    setLoading(true);
    for (const row of toUpload) {
      const form = new FormData();
      form.set("name", row.name.trim());
      form.set("file", row.file!);
      const res = await fetch(`/api/bookings/${bookingId}/attachments`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: "Upload failed", description: data.error ?? "Unknown error", variant: "destructive" });
        setLoading(false);
        return;
      }
    }
    setLoading(false);
    setRows([{ name: "", file: null }]);
    toast({ title: "Attachments uploaded" });
    onUploaded();
  }

  const list = attachments ?? [];
  return (
    <div className="border-t pt-4 mt-4">
      <p className="font-medium mb-2">Receipts / attachments (optional)</p>
      {list.length > 0 && (
        <ul className="text-sm text-muted-foreground mb-2">
          {list.map((a) => (
            <li key={a.id}>{a.name}</li>
          ))}
        </ul>
      )}
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2 items-end flex-wrap">
            <input
              type="text"
              placeholder="Attachment name"
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-40"
              value={row.name}
              onChange={(e) =>
                setRows((r) => {
                  const next = [...r];
                  next[i] = { ...next[i], name: e.target.value };
                  return next;
                })
              }
            />
            <input
              type="file"
              className="text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setRows((r) => {
                  const next = [...r];
                  next[i] = { ...next[i], file: file ?? null };
                  return next;
                });
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          + Add attachment
        </Button>
        <Button type="button" size="sm" onClick={uploadAll} disabled={loading}>
          Upload
        </Button>
      </div>
    </div>
  );
}
