#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const docsDir = path.join(root, "content", "fake-docs");
const banner = "FAKE SAMPLE DOCUMENT — NOT REAL CONTRACT LANGUAGE — FOR KIA STICK TESTING ONLY";
const forbiddenDocTerms = [
  /\bAPWU\b/i,
  /\bUSPS\b/i,
  /\bUnited States Postal Service\b/i,
  /\bAmerican Postal Workers Union\b/i
];

const files = (await readdir(docsDir)).filter((file) => file.endsWith(".md")).sort();
let failures = 0;

for (const file of files) {
  const absolute = path.join(docsDir, file);
  const text = await readFile(absolute, "utf8");
  if (!text.includes(banner)) {
    console.error(`missing fake banner: ${file}`);
    failures += 1;
  }
  for (const pattern of forbiddenDocTerms) {
    if (pattern.test(text)) {
      console.error(`forbidden real-world term in fake doc: ${file} (${pattern})`);
      failures += 1;
    }
  }
}

if (files.length < 12) {
  console.error(`expected at least 12 fake docs, found ${files.length}`);
  failures += 1;
}

if (failures > 0) {
  process.exit(1);
}

console.log(`Fake-doc scan passed for ${files.length} documents.`);
