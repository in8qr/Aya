/**
 * Simple file logger for server-side errors and important events.
 * Logs are written to logs/app.log so you can share them for debugging.
 */

import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "app.log");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function formatMessage(level: string, message: string, meta?: unknown): string {
  const time = new Date().toISOString();
  const metaStr = meta !== undefined ? " " + JSON.stringify(meta) : "";
  return `[${time}] [${level}] ${message}${metaStr}\n`;
}

export function log(level: "info" | "warn" | "error", message: string, meta?: unknown): void {
  try {
    ensureLogDir();
    fs.appendFileSync(LOG_FILE, formatMessage(level, message, meta));
  } catch (e) {
    console.error("Logger failed to write:", e);
  }
}

export function logError(message: string, error?: unknown): void {
  const meta = error instanceof Error ? { message: error.message, stack: error.stack } : error;
  log("error", message, meta);
}

export function logInfo(message: string, meta?: unknown): void {
  log("info", message, meta);
}
