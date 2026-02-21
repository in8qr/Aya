import { Resend } from "resend";
import { isSmtpConfigured, sendMail as sendMailSmtp, type EmailAttachment } from "@/lib/email-verification";
import { wrapEmailContent, emailStyles, emailList } from "@/lib/email-template";
import { getEmailCopy, type EmailLocale } from "@/lib/email-i18n";
import { buildBookingICS } from "@/lib/calendar-invite";
import { getEmailFrom } from "@/lib/site-settings";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
  locale?: EmailLocale;
}) {
  const { to, teamMemberName, customerName, customerEmail, customerPhone, packageName, startAt, durationMinutes, location, locale = "en" } = params;
  const t = getEmailCopy(locale).assignment;
  const dateStr = startAt.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });
  const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
  const endStr = endAt.toLocaleTimeString(undefined, { timeStyle: "short" });
  const listItems = [
    `${escapeHtml(packageName)}`,
    `${escapeHtml(dateStr)} – ${escapeHtml(endStr)}`,
    `${durationMinutes} min`,
    ...(location ? [escapeHtml(location)] : []),
    `Customer: ${escapeHtml(customerName)}`,
    escapeHtml(customerEmail),
    ...(customerPhone ? [escapeHtml(customerPhone)] : []),
  ];
  const content = `
    <p style="${emailStyles.body}">Hi ${escapeHtml(teamMemberName)},</p>
    <p style="${emailStyles.body}">${t.body}</p>
    ${emailList(listItems)}
    <p style="${emailStyles.body}">Please confirm your availability if needed.</p>
  `;
  const html = wrapEmailContent(content, { title: t.title, dir: locale === "ar" ? "rtl" : "ltr" });
  const subject = t.subject;
  if (isSmtpConfigured()) {
    await sendMailSmtp({ to, subject, html });
    return;
  }
  const resend = getResend();
  if (!resend) return;
  const from = await getEmailFrom();
  const { error } = await resend.emails.send({ from, to: [to], subject, html });
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
  teamMemberEmail?: string | null;
  teamMemberPhone?: string | null;
  locale?: EmailLocale;
}) {
  const {
    to,
    customerName,
    packageName,
    startAt,
    durationMinutes,
    location,
    teamMemberName,
    teamMemberEmail,
    teamMemberPhone,
    locale = "en",
  } = params;
  const t = getEmailCopy(locale).confirmation;
  const dateStr = startAt.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });
  const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
  const endStr = endAt.toLocaleTimeString(undefined, { timeStyle: "short" });
  const listItems = [
    escapeHtml(packageName),
    `${escapeHtml(dateStr)} – ${escapeHtml(endStr)}`,
    `${durationMinutes} min`,
    ...(location ? [escapeHtml(location)] : []),
  ];
  let contactBlock = "";
  if (teamMemberName && (teamMemberEmail || teamMemberPhone)) {
    contactBlock = `
      <p style="${emailStyles.body}; margin-top:20px;"><strong style="${emailStyles.strong}">${t.contactTitle}</strong></p>
      <p style="${emailStyles.body}">${escapeHtml(teamMemberName)}</p>
      ${teamMemberPhone ? `<p style="${emailStyles.body}">${t.phone}: <a href="tel:${escapeHtml(teamMemberPhone)}" style="${emailStyles.link}">${escapeHtml(teamMemberPhone)}</a></p>` : ""}
      ${teamMemberEmail ? `<p style="${emailStyles.body}">${t.email}: <a href="mailto:${escapeHtml(teamMemberEmail)}" style="${emailStyles.link}">${escapeHtml(teamMemberEmail)}</a></p>` : ""}
    `;
  }
  const content = `
    <p style="${emailStyles.body}">Hi ${escapeHtml(customerName)},</p>
    <p style="${emailStyles.body}">${t.body}</p>
    ${emailList(listItems)}
    <p style="${emailStyles.body}">${t.paymentNote}</p>
    ${contactBlock}
    <p style="${emailStyles.body}">${t.changeNote}</p>
  `;
  const html = wrapEmailContent(content, { title: t.title, dir: locale === "ar" ? "rtl" : "ltr" });
  const subject = t.subject;
  const ics = buildBookingICS({
    title: `${packageName} – Aya Eye`,
    startAt,
    durationMinutes,
    location,
    description: `${packageName}, ${dateStr}`,
  });
  const attachments: EmailAttachment[] = [{ filename: "invite.ics", content: ics }];
  if (isSmtpConfigured()) {
    await sendMailSmtp({ to, subject, html, attachments });
    return;
  }
  const resend = getResend();
  if (!resend) return;
  const from = await getEmailFrom();
  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html,
    attachments: [{ filename: "invite.ics", content: Buffer.from(ics, "utf-8").toString("base64") }],
  });
  if (error) throw new Error(JSON.stringify(error));
}

export async function sendRejectionEmail(params: {
  to: string;
  customerName: string;
  packageName: string;
  startAt: Date;
  reason?: string | null;
  locale?: EmailLocale;
}) {
  const { to, customerName, packageName, startAt, reason, locale = "en" } = params;
  const t = getEmailCopy(locale).rejection;
  const dateStr = startAt.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });
  const reasonBlock = reason?.trim()
    ? `<p style="${emailStyles.body}"><strong style="${emailStyles.strong}">Reason:</strong></p><p style="${emailStyles.body}">${escapeHtml(reason.trim())}</p>`
    : "";
  const content = `
    <p style="${emailStyles.body}">Hi ${escapeHtml(customerName)},</p>
    <p style="${emailStyles.body}">Unfortunately we are unable to confirm your booking request for <strong style="${emailStyles.strong}">${escapeHtml(packageName)}</strong> on <strong style="${emailStyles.strong}">${escapeHtml(dateStr)}</strong>.</p>
    ${reasonBlock}
    <p style="${emailStyles.body}">Please feel free to submit a new request for another date or time, or contact us if you have any questions.</p>
  `;
  const html = wrapEmailContent(content, { title: t.title, dir: locale === "ar" ? "rtl" : "ltr" });
  const subject = t.subject;
  if (isSmtpConfigured()) {
    await sendMailSmtp({ to, subject, html });
    return;
  }
  const resend = getResend();
  if (!resend) return;
  const from = await getEmailFrom();
  const { error } = await resend.emails.send({ from, to: [to], subject, html });
  if (error) throw new Error(JSON.stringify(error));
}
