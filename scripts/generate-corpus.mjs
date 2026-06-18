#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceDir = path.join(root, "content", "fake-docs");
const outPath = path.join(root, "data", "fake-corpus.json");
const requiredBanner = "FAKE SAMPLE DOCUMENT — NOT REAL CONTRACT LANGUAGE — FOR KIA STICK TESTING ONLY";

const requiredKeys = [
  "id",
  "title",
  "type",
  "class",
  "scope",
  "status",
  "citable",
  "privacy",
  "review",
  "redaction",
  "ocr",
  "corpusVersion",
  "indexVersion",
  "page",
  "article",
  "section",
  "file",
  "tags"
];

const sourceClasses = [
  "controlling_contract_language",
  "local_controlling_source",
  "signed_mou",
  "joint_interpretation",
  "official_manual",
  "persuasive_authority",
  "local_settlement",
  "past_practice_evidence",
  "supporting_evidence",
  "steward_note",
  "historical_background",
  "unknown_unverified"
];

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed.includes(",")) {
    return trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  }
  return trimmed;
}

function parseDoc(raw, filename) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error(`${filename} is missing YAML-style frontmatter`);
  }

  const metadata = {};
  for (const line of match[1].split("\n")) {
    const colon = line.indexOf(":");
    if (colon < 1) continue;
    const key = line.slice(0, colon).trim();
    metadata[key] = parseScalar(line.slice(colon + 1));
  }

  for (const key of requiredKeys) {
    if (metadata[key] === undefined || metadata[key] === "") {
      throw new Error(`${filename} is missing metadata key ${key}`);
    }
  }

  if (!sourceClasses.includes(metadata.class)) {
    throw new Error(`${filename} has unsupported source class ${metadata.class}`);
  }

  const body = match[2].trim();
  if (!body.includes(requiredBanner)) {
    throw new Error(`${filename} is missing required fake-document banner`);
  }

  const hash = createHash("sha256").update(body, "utf8").digest("hex");
  return {
    ...metadata,
    hash,
    excerpt: body
      .replace(/^# .+\n+/, "")
      .split(/\n\n+/)
      .slice(0, 2)
      .join("\n\n"),
    body,
  };
}

const files = (await readdir(sourceDir))
  .filter((file) => file.endsWith(".md"))
  .sort();

const docs = [];
for (const file of files) {
  const absolute = path.join(sourceDir, file);
  const raw = await readFile(absolute, "utf8");
  docs.push(parseDoc(raw, file));
}

const missingClasses = sourceClasses.filter(
  (sourceClass) => !docs.some((doc) => doc.class === sourceClass)
);

if (missingClasses.length > 0) {
  throw new Error(`Missing fake source classes: ${missingClasses.join(", ")}`);
}

const corpusVersion = docs[0]?.corpusVersion ?? "unknown";
const indexVersion = docs[0]?.indexVersion ?? "unknown";

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(
  outPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      corpusVersion,
      indexVersion,
      requiredBanner,
      sourceClasses,
      docs,
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log(`Generated ${path.relative(root, outPath)} with ${docs.length} fake documents.`);
