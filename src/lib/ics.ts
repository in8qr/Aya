/**
 * Generate an ICS (iCalendar) file string for adding a booking to a phone/desktop calendar.
 * Format: https://www.kanzaki.com/docs/ical/
 */
function formatICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); // e.g. 20260219T140000Z
}

function escapeICS(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export type BookingForICS = {
  title: string;
  startAt: string; // ISO
  durationMinutes: number;
  location?: string | null;
  description?: string;
};

export function buildICS(booking: BookingForICS): string {
  const start = new Date(booking.startAt);
  const end = new Date(start.getTime() + booking.durationMinutes * 60 * 1000);
  const now = new Date();
  const uid = `aya-eye-${start.getTime()}-${Math.random().toString(36).slice(2, 10)}@ayaeye`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aya Eye//Booking//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(now)}Z`,
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${escapeICS(booking.title)}`,
  ];
  if (booking.location?.trim()) {
    lines.push(`LOCATION:${escapeICS(booking.location.trim())}`);
  }
  if (booking.description?.trim()) {
    lines.push(`DESCRIPTION:${escapeICS(booking.description.trim())}`);
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadICS(booking: BookingForICS, filename?: string): void {
  const ics = buildICS(booking);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `booking-${booking.startAt.slice(0, 10)}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
