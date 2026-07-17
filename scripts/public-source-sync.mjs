#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeApprovedArticleHtml,
  normalizedContentForHash,
  PUBLIC_SOURCE_ACCESS_MODE,
  PUBLIC_SOURCE_CACHE_RELATIVE_PATH,
  PUBLIC_SOURCE_CACHE_SCHEMA,
  PUBLIC_SOURCE_CLASS,
  PUBLIC_SOURCE_CONTROLLING_FOR_USPS,
  PUBLIC_SOURCE_ID,
  PUBLIC_SOURCE_MAX_RESPONSE_BYTES,
  PUBLIC_SOURCE_OWNER,
  PUBLIC_SOURCE_POSTAL_APPLICABILITY,
  PUBLIC_SOURCE_SENSITIVITY,
  PUBLIC_SOURCE_TIMEOUT_MS,
  PUBLIC_SOURCE_TITLE,
  PUBLIC_SOURCE_URL,
  validateApprovedFinalUrl,
  validateHtmlContentType,
  validateRedirectTarget,
  validateResponseByteCount,
  validateSyncArguments,
} from "../lib/publicSource.ts";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertRepositoryRoot() {
  const expected = realpathSync(fileURLToPath(new URL("..", import.meta.url)));
  const actual = realpathSync(process.cwd());
  if (actual !== expected) throw new Error("Run public-source-sync from the repository root only.");
  return expected;
}

async function readBoundedBody(response) {
  const declared = response.headers.get("content-length");
  if (declared && /^\d+$/.test(declared)) validateResponseByteCount(Number.parseInt(declared, 10));
  if (!response.body) throw new Error("Approved source response has no body.");
  const chunks = [];
  let byteCount = 0;
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteCount += value.byteLength;
    if (byteCount > PUBLIC_SOURCE_MAX_RESPONSE_BYTES) {
      await reader.cancel();
      validateResponseByteCount(byteCount);
    }
    chunks.push(value);
  }
  validateResponseByteCount(byteCount);
  const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  return { bytes, byteCount };
}

async function fetchApprovedSource(signal) {
  let currentUrl = PUBLIC_SOURCE_URL;
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    const response = await fetch(currentUrl, { method: "GET", redirect: "manual", signal });
    if (response.status >= 300 && response.status < 400) {
      if (redirectCount === 3) throw new Error("Approved source exceeded the redirect limit.");
      const location = response.headers.get("location");
      if (!location) throw new Error("Approved source redirect omitted its target.");
      currentUrl = validateRedirectTarget(currentUrl, location).toString();
      continue;
    }
    if (!response.ok) throw new Error(`Approved source returned HTTP ${response.status}.`);
    validateApprovedFinalUrl(currentUrl);
    const contentType = validateHtmlContentType(response.headers.get("content-type"));
    const body = await readBoundedBody(response);
    return { ...body, contentType, finalUrl: currentUrl };
  }
  throw new Error("Approved source redirect handling failed closed.");
}

function writeCache(repositoryRoot, cache) {
  const cacheDirectory = path.join(repositoryRoot, ".kia-public-data");
  const cachePath = path.join(repositoryRoot, PUBLIC_SOURCE_CACHE_RELATIVE_PATH);
  if (existsSync(cacheDirectory)) {
    const stat = lstatSync(cacheDirectory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Public source cache directory is unsafe.");
  } else {
    mkdirSync(cacheDirectory, { mode: 0o700 });
  }
  chmodSync(cacheDirectory, 0o700);
  if (existsSync(cachePath)) {
    const stat = lstatSync(cachePath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Public source cache file is unsafe.");
  }
  const temporaryPath = path.join(cacheDirectory, ".nlrb-weingarten-rights.tmp");
  if (existsSync(temporaryPath)) rmSync(temporaryPath);
  try {
    writeFileSync(temporaryPath, `${JSON.stringify(cache, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
    renameSync(temporaryPath, cachePath);
    chmodSync(cachePath, 0o600);
  } finally {
    if (existsSync(temporaryPath)) rmSync(temporaryPath);
  }
  return cachePath;
}

async function main() {
  validateSyncArguments(process.argv.slice(2));
  const repositoryRoot = assertRepositoryRoot();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PUBLIC_SOURCE_TIMEOUT_MS);
  try {
    const fetched = await fetchApprovedSource(controller.signal);
    const html = fetched.bytes.toString("utf8");
    const sections = normalizeApprovedArticleHtml(html);
    if (sections.length < 4) throw new Error("Approved source produced too few article sections.");
    const retrievedAt = new Date().toISOString();
    const responseHash = sha256(fetched.bytes);
    const normalizedHash = sha256(normalizedContentForHash(sections));
    const cache = {
      schema: PUBLIC_SOURCE_CACHE_SCHEMA,
      source: {
        id: PUBLIC_SOURCE_ID,
        title: PUBLIC_SOURCE_TITLE,
        owner: PUBLIC_SOURCE_OWNER,
        url: PUBLIC_SOURCE_URL,
        finalUrl: validateApprovedFinalUrl(fetched.finalUrl),
        sourceClass: PUBLIC_SOURCE_CLASS,
        sensitivity: PUBLIC_SOURCE_SENSITIVITY,
        accessMode: PUBLIC_SOURCE_ACCESS_MODE,
        postalApplicability: PUBLIC_SOURCE_POSTAL_APPLICABILITY,
        controllingForUsps: PUBLIC_SOURCE_CONTROLLING_FOR_USPS,
        readOnly: true,
      },
      retrievedAt,
      response: {
        contentType: fetched.contentType,
        byteCount: fetched.byteCount,
        sha256: responseHash,
      },
      normalized: {
        sha256: normalizedHash,
        sectionCount: sections.length,
        sections,
      },
    };
    const cachePath = writeCache(repositoryRoot, cache);
    process.stdout.write(`${JSON.stringify({
      result: "PASS",
      sourceId: PUBLIC_SOURCE_ID,
      approvedUrl: PUBLIC_SOURCE_URL,
      finalUrl: fetched.finalUrl,
      contentType: fetched.contentType,
      byteCount: fetched.byteCount,
      responseSha256: responseHash,
      normalizedSha256: normalizedHash,
      retrievedAt,
      sectionCount: sections.length,
      sectionIds: sections.map((section) => section.id),
      cachePath,
    }, null, 2)}\n`);
  } finally {
    clearTimeout(timer);
  }
}

main().catch((error) => {
  const message = error?.name === "AbortError" ? "Approved source fetch timed out." : error instanceof Error ? error.message : "Public source sync failed.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
