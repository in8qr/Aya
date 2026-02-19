/**
 * Build an ICS calendar invite for a booking so the customer can add it to their calendar.
 */
function formatICSUtil(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeICS(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildBookingICS(params: {
  title: string;
  startAt: Date;
  durationMinutes: number;
  location: string | null;
  description?: string;
}): string {
  const { title, startAt, durationMinutes, location, description } = params;
  const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
  const now = new Date();
  const uid = `ayaeye-${startAt.getTime()}@ayaeye`;
  const dtstamp = formatICSUtil(now);
  const dtstart = formatICSUtil(startAt);
  const dtend = formatICSUtil(endAt);
  const loc = location ? escapeICS(location) : "";
  const desc = description ? escapeICS(description) : escapeICS(title);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aya Eye//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeICS(title)}`,
    `DESCRIPTION:${desc}`,
    ...(loc ? [`LOCATION:${loc}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}
