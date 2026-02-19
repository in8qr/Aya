/**
 * Local file storage for portfolio images (folder on disk instead of S3).
 * Files are stored in uploads/portfolio/ in the project directory.
 */

import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "portfolio");

function ensureDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Save a portfolio image to uploads/portfolio/<filename>.
 * Returns the public URL path (e.g. for use in img src).
 */
export function savePortfolioFile(
  filename: string,
  body: Buffer | Uint8Array
): string {
  ensureDir();
  const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = path.join(UPLOAD_DIR, safeName);
  fs.writeFileSync(filePath, body);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/api/storage/portfolio/${encodeURIComponent(safeName)}`;
}

/**
 * Read a portfolio file by filename (basename only). Returns buffer or null if not found.
 */
export function getPortfolioFileBuffer(filename: string): Buffer | null {
  const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = path.join(UPLOAD_DIR, safeName);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

// --- Receipts (local fallback when S3 is not configured) ---

const RECEIPTS_DIR = path.join(process.cwd(), "uploads", "receipts");

function safeReceiptKey(key: string): string {
  const parts = key.split("/").filter((p) => p !== "" && p !== "..");
  return parts.join(path.sep);
}

export function saveReceiptFile(key: string, body: Buffer | Uint8Array): void {
  const safe = safeReceiptKey(key);
  if (!safe.startsWith("receipts")) return;
  const filePath = path.join(RECEIPTS_DIR, safe);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, body);
}

export function getReceiptFileBuffer(key: string): Buffer | null {
  const safe = safeReceiptKey(key);
  if (!safe.startsWith("receipts")) return null;
  const filePath = path.join(RECEIPTS_DIR, safe);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

