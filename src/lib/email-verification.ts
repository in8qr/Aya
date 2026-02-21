import { randomInt } from "crypto";
import nodemailer from "nodemailer";
import { logError } from "@/lib/logger";
import { wrapEmailContent, emailStyles } from "@/lib/email-template";
import { getEmailCopy, type EmailLocale } from "@/lib/email-i18n";
import {
  getEmailFrom,
  getSmtpHost,
  getSmtpUser,
  getSmtpPassword,
  getSmtpPort,
  getSmtpSecure,
} from "@/lib/site-settings";

/**
 * Sends the verification OTP email. Uses SMTP (e.g. Gmail) so the admin can
 * use any provider via environment variables. From address is configurable.
 */
const OTP_EXPIRY_MINUTES = 15;

/** Generate a 6-digit OTP. */
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

async function getTransporter(): Promise<nodemailer.Transporter | null> {
  const [host, user, pass] = await Promise.all([
    getSmtpHost(),
    getSmtpUser(),
    getSmtpPassword(),
  ]);
  if (!host || !user || !pass) return null;
  const port = await getSmtpPort();
  const secure = await getSmtpSecure();
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

/** From address for verification emails (uses admin setting or env). */
export async function getVerificationFrom(): Promise<string> {
  return getEmailFrom();
}

export async function sendVerificationOtpEmail(
  to: string,
  otp: string,
  locale: EmailLocale = "en"
): Promise<boolean> {
  const transporter = await getTransporter();
  if (!transporter) {
    logError("Email verification: SMTP not configured (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)");
    return false;
  }
  const from = await getEmailFrom();
  const t = getEmailCopy(locale).otp;
  const content = `
    <p style="${emailStyles.body}">${t.body}</p>
    <p style="${emailStyles.body}"><strong style="${emailStyles.strong}">${otp}</strong></p>
    <p style="${emailStyles.subtitle}">${t.expiry}</p>
    <p style="${emailStyles.body}">If you didn't request this, you can ignore this email.</p>
  `;
  const html = wrapEmailContent(content, { title: t.title, dir: locale === "ar" ? "rtl" : "ltr" });
  try {
    await transporter.sendMail({
      from,
      to,
      subject: t.subject,
      text: `${t.body} ${otp}. ${t.expiry}`,
      html,
    });
    return true;
  } catch (e) {
    logError("Send verification OTP email failed", e);
    return false;
  }
}

export { OTP_EXPIRY_MINUTES };

/** Whether SMTP is configured (used for OTP and for booking emails when set). */
export async function isSmtpConfigured(): Promise<boolean> {
  const transporter = await getTransporter();
  return transporter !== null;
}

export type EmailAttachment = { filename: string; content: string | Buffer };

/** Single sender for all app email (OTP + team notifications). Uses admin setting or env. */
export async function sendMail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}): Promise<boolean> {
  const transporter = await getTransporter();
  if (!transporter) return false;
  const from = await getEmailFrom();
  try {
    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      attachments: params.attachments?.map((a) => ({
        filename: a.filename,
        content: typeof a.content === "string" ? a.content : a.content,
      })),
    });
    return true;
  } catch (e) {
    logError("sendMail failed", e);
    return false;
  }
}
