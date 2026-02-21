#!/usr/bin/env node
/**
 * Ensures npm run build is executed from the app root (the directory that
 * contains package.json and src/). If the build runs from a parent directory,
 * Next.js may compile a nested copy of the app and report paths like
 * ./aya-eye/aya-eye/src/... and use stale code that wasn't updated by git pull.
 *
 * Run this before next build (e.g. in package.json: "build": "node scripts/ensure-app-root.js && next build")
 */
const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
const hasPackageJson = fs.existsSync(path.join(cwd, "package.json"));
const hasSrc = fs.existsSync(path.join(cwd, "src"));
const hasNextConfig =
  fs.existsSync(path.join(cwd, "next.config.ts")) ||
  fs.existsSync(path.join(cwd, "next.config.js"));

if (hasPackageJson && hasSrc && hasNextConfig) {
  process.exit(0);
}

console.error(`
[ensure-app-root] ERROR: Run "npm run build" from the app root.

  The app root is the directory that contains:
    - package.json
    - src/
    - next.config.ts or next.config.js

  Current directory (cwd): ${cwd}
  Has package.json: ${hasPackageJson}
  Has src/: ${hasSrc}
  Has next.config: ${hasNextConfig}

  If you see build errors pointing at "./aya-eye/aya-eye/src/...", you are
  likely one directory too high. Run:
    cd <path-to-app-root>   # e.g. cd ~/apps/aya-eye/aya-eye
    git pull origin main
    npm run build
`);
process.exit(1);
