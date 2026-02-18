import { Resend } from "resend";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}
const from = process.env.EMAIL_FROM ?? "Aya Eye <noreply@example.com>";

export async function sendAssignmentEmail(params: {
  to: string;
  teamMemberName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  packageName: string;
  startAt: Date;
  durationMinutes: number;
  location: string | null;
}) {
  const { to, teamMemberName, customerName, customerEmail, customerPhone, packageName, startAt, durationMinutes, location } = params;
  const dateStr = startAt.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });
  const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
  const endStr = endAt.toLocaleTimeString(undefined, { timeStyle: "short" });

  const resend = getResend();
  if (!resend) return;
  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: `New booking assigned: ${packageName} – ${dateStr}`,
    html: `
      <h2>Booking assigned to you</h2>
      <p>Hi ${teamMemberName},</p>
      <p>You have been assigned the following booking.</p>
      <ul>
        <li><strong>Package:</strong> ${packageName}</li>
        <li><strong>Date & time:</strong> ${dateStr} – ${endStr}</li>
        <li><strong>Duration:</strong> ${durationMinutes} minutes</li>
        ${location ? `<li><strong>Location:</strong> ${location}</li>` : ""}
        <li><strong>Customer:</strong> ${customerName}</li>
        <li><strong>Customer email:</strong> ${customerEmail}</li>
        ${customerPhone ? `<li><strong>Customer phone:</strong> ${customerPhone}</li>` : ""}
      </ul>
      <p>Please confirm your availability if needed.</p>
      <p>— Aya Eye</p>
    `,
  });
  if (error) throw new Error(JSON.stringify(error));
}

export async function sendConfirmationEmail(params: {
  to: string;
  customerName: string;
  packageName: string;
  startAt: Date;
  durationMinutes: number;
  location: string | null;
  teamMemberName?: string | null;
}) {
  const { to, customerName, packageName, startAt, durationMinutes, location, teamMemberName } = params;
  const dateStr = startAt.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });
  const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
  const endStr = endAt.toLocaleTimeString(undefined, { timeStyle: "short" });

  const resend = getResend();
  if (!resend) return;
  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: `Booking confirmed: ${packageName} – ${dateStr}`,
    html: `
      <h2>Your booking is confirmed</h2>
      <p>Hi ${customerName},</p>
      <p>Your photography session has been confirmed.</p>
      <ul>
        <li><strong>Package:</strong> ${packageName}</li>
        <li><strong>Date & time:</strong> ${dateStr} – ${endStr}</li>
        <li><strong>Duration:</strong> ${durationMinutes} minutes</li>
        ${location ? `<li><strong>Location:</strong> ${location}</li>` : ""}
        ${teamMemberName ? `<li><strong>Your photographer:</strong> ${teamMemberName}</li>` : ""}
      </ul>
      <p><strong>Payment:</strong> No online payments. Payment will be handled offline (e.g. on the day or by bank transfer as agreed).</p>
      <p>If you need to change or cancel, please contact us as soon as possible.</p>
      <p>— Aya Eye</p>
    `,
  });
  if (error) throw new Error(JSON.stringify(error));
}

export async function sendRejectionEmail(params: {
  to: string;
  customerName: string;
  packageName: string;
  startAt: Date;
}) {
  const { to, customerName, packageName, startAt } = params;
  const dateStr = startAt.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });

  const resend = getResend();
  if (!resend) return;
  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: `Booking request update: ${packageName}`,
    html: `
      <h2>Booking request update</h2>
      <p>Hi ${customerName},</p>
      <p>Unfortunately we are unable to confirm your booking request for <strong>${packageName}</strong> on <strong>${dateStr}</strong>.</p>
      <p>Please feel free to submit a new request for another date or time, or contact us if you have any questions.</p>
      <p>— Aya Eye</p>
    `,
  });
  if (error) throw new Error(JSON.stringify(error));
}
