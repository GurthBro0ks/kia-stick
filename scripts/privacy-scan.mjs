#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const forbiddenTrackedPrefixes = [
  "uploads/",
  "data/private/",
  "data/real-documents/",
  "exports/",
  "backups/",
  "vector-store/",
  "DB/"
];
const forbiddenExtensions = [
  ".sqlite",
  ".sqlite3",
  ".pcap",
  ".pcapng",
  ".mitm",
  ".har",
  ".apk",
  ".xapk",
  ".so",
  ".luac",
  ".7z",
  ".zip",
  ".rar",
  ".tar",
  ".tar.gz",
  ".tgz"
];
const secretPatterns = [
  /BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY/,
  /\b[A-Z0-9_]*API[_-]?KEY\s*=\s*['"]?[A-Za-z0-9_-]{16,}/i,
  /\b(secret|token|cookie|password)\s*=\s*['"]?[A-Za-z0-9_-]{12,}/i,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}/,
  /\bsk-[A-Za-z0-9]{20,}/
];

function candidateFiles() {
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    cwd: root,
    encoding: "utf8",
  });
  return output
    .split("\0")
    .filter(Boolean)
    .map((file) => path.join(root, file));
}

const files = candidateFiles();
let failures = 0;

for (const absolute of files) {
  const rel = path.relative(root, absolute).replaceAll(path.sep, "/");
  if (forbiddenTrackedPrefixes.some((prefix) => rel.startsWith(prefix))) {
    console.error(`forbidden project path present: ${rel}`);
    failures += 1;
  }
  if (rel.startsWith(".env") && rel !== ".env.example") {
    console.error(`forbidden env file present: ${rel}`);
    failures += 1;
  }
  if (forbiddenExtensions.some((ext) => rel.endsWith(ext))) {
    console.error(`forbidden sensitive/proprietary extension present: ${rel}`);
    failures += 1;
  }

  const info = await stat(absolute);
  if (info.size > 1024 * 1024) continue;
  const text = await readFile(absolute, "utf8").catch(() => "");
  for (const pattern of secretPatterns) {
    if (pattern.test(text)) {
      console.error(`possible secret in ${rel}: ${pattern}`);
      failures += 1;
    }
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log(`Privacy scan passed for ${files.length} files.`);
