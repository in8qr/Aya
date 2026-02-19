import nodemailer from "nodemailer";
import { logError } from "@/lib/logger";

/**
 * Sends the verification OTP email. Uses SMTP (e.g. Gmail) so the admin can
 * use any provider via environment variables. From address is configurable.
 */
const OTP_EXPIRY_MINUTES = 15;

function getTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === "true";
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

/** From address for verification emails (configurable; e.g. your Gmail). */
export function getVerificationFrom(): string {
  return (
    process.env.EMAIL_VERIFICATION_FROM ||
    process.env.EMAIL_FROM ||
    "Aya Eye <noreply@example.com>"
  );
}

export async function sendVerificationOtpEmail(to: string, otp: string): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    logError("Email verification: SMTP not configured (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)");
    return false;
  }
  const from = getVerificationFrom();
  const appName = "Aya Eye";
  try {
    await transporter.sendMail({
      from,
      to,
      subject: `${appName} – Your verification code`,
      text: `Your verification code is: ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes. If you didn't request this, you can ignore this email.`,
      html: `
        <h2>Verify your email</h2>
        <p>Your verification code is: <strong>${otp}</strong></p>
        <p>It expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
        <p>If you didn't request this, you can ignore this email.</p>
        <p>— ${appName}</p>
      `,
    });
    return true;
  } catch (e) {
    logError("Send verification OTP email failed", e);
    return false;
  }
}

export { OTP_EXPIRY_MINUTES };

/** Whether SMTP is configured (used for OTP and for booking emails when set). */
export function isSmtpConfigured(): boolean {
  return getTransporter() !== null;
}

/** Single sender for all app email (OTP + team notifications). Uses EMAIL_FROM / EMAIL_VERIFICATION_FROM. */
export async function sendMail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;
  const from = getVerificationFrom();
  try {
    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    return true;
  } catch (e) {
    logError("sendMail failed", e);
    return false;
  }
}
