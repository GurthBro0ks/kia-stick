#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CBA_CACHE_SCHEMA,
  CBA_CONTROLLING_SCOPE,
  CBA_DOCUMENT_STATUS,
  CBA_EFFECTIVE_END,
  CBA_EFFECTIVE_START,
  CBA_EXPECTED_PDF_PAGES,
  CBA_JSON_CACHE_RELATIVE_PATH,
  CBA_LEGAL_ADVICE,
  CBA_MAX_RESPONSE_BYTES,
  CBA_PDF_CACHE_RELATIVE_PATH,
  CBA_SCOPE_REQUIRES_FACT_MATCH,
  CBA_SOURCE_ACCESS_MODE,
  CBA_SOURCE_CLASS,
  CBA_SOURCE_ID,
  CBA_SOURCE_OWNER,
  CBA_SOURCE_PAGE_URL,
  CBA_SOURCE_PDF_URL,
  CBA_SOURCE_SENSITIVITY,
  CBA_SOURCE_TITLE,
  CBA_TIMEOUT_MS,
  normalizeExtractedCbaText,
  validateCbaContentType,
  validateCbaFinalUrl,
  validateCbaPageCount,
  validateCbaRedirectTarget,
  validateCbaResponseByteCount,
  validateCbaSyncArguments,
  validatePdfMagic,
  validatePopplerToolAvailability,
} from "../lib/cbaSource.ts";
import { evaluateCbaSourceOverwriteGuard } from "../lib/cbaCitationIntegrity.ts";
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

async function readBoundedBody(response, maximumBytes, validateByteCount) {
  const declared = response.headers.get("content-length");
  if (declared && /^\d+$/.test(declared)) validateByteCount(Number.parseInt(declared, 10));
  if (!response.body) throw new Error("Approved source response has no body.");
  const chunks = [];
  let byteCount = 0;
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteCount += value.byteLength;
    if (byteCount > maximumBytes) {
      await reader.cancel();
      validateByteCount(byteCount);
    }
    chunks.push(value);
  }
  validateByteCount(byteCount);
  return { bytes: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))), byteCount };
}

async function fetchApprovedNlrB(signal) {
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
    const body = await readBoundedBody(response, PUBLIC_SOURCE_MAX_RESPONSE_BYTES, validateResponseByteCount);
    return { ...body, contentType, finalUrl: currentUrl };
  }
  throw new Error("Approved source redirect handling failed closed.");
}

async function fetchApprovedCba(signal) {
  let currentUrl = CBA_SOURCE_PDF_URL;
  const redirectChain = [currentUrl];
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    const response = await fetch(currentUrl, { method: "GET", redirect: "manual", signal });
    if (response.status >= 300 && response.status < 400) {
      if (redirectCount === 3) throw new Error("Approved CBA source exceeded the redirect limit.");
      const location = response.headers.get("location");
      if (!location) throw new Error("Approved CBA redirect omitted its target.");
      currentUrl = validateCbaRedirectTarget(currentUrl, location).toString();
      redirectChain.push(currentUrl);
      continue;
    }
    if (!response.ok) throw new Error(`Approved CBA source returned HTTP ${response.status}.`);
    validateCbaFinalUrl(currentUrl);
    const body = await readBoundedBody(response, CBA_MAX_RESPONSE_BYTES, validateCbaResponseByteCount);
    validatePdfMagic(body.bytes);
    const contentType = validateCbaContentType(response.headers.get("content-type"), body.bytes);
    return { ...body, contentType, finalUrl: currentUrl, redirectChain };
  }
  throw new Error("Approved CBA redirect handling failed closed.");
}

function ensureCacheDirectory(repositoryRoot) {
  const cacheDirectory = path.join(repositoryRoot, ".kia-public-data");
  if (existsSync(cacheDirectory)) {
    const stat = lstatSync(cacheDirectory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Public source cache directory is unsafe.");
    if (realpathSync(cacheDirectory) !== cacheDirectory) throw new Error("Public source cache directory resolves outside its fixed location.");
  } else {
    mkdirSync(cacheDirectory, { mode: 0o700 });
  }
  chmodSync(cacheDirectory, 0o700);
  return cacheDirectory;
}

function writeNlrBCache(repositoryRoot, cache) {
  const cacheDirectory = ensureCacheDirectory(repositoryRoot);
  const cachePath = path.join(repositoryRoot, PUBLIC_SOURCE_CACHE_RELATIVE_PATH);
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

function readExistingCbaCache(jsonPath) {
  if (!existsSync(jsonPath)) return null;
  const stat = lstatSync(jsonPath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Existing CBA cache file is unsafe.");
  try {
    return JSON.parse(readFileSync(jsonPath, "utf8"));
  } catch {
    throw new Error("Existing CBA cache JSON is invalid; source sync will not overwrite it.");
  }
}

function boundedDriftSummary(report) {
  const counts = report.paragraphDrift.reduce((summary, item) => {
    summary[item.state] = (summary[item.state] ?? 0) + 1;
    return summary;
  }, {});
  return {
    sourceState: report.sourceState,
    currentSourceInstance: report.currentSourceInstance.sourceInstanceId.slice(0, 12),
    proposedSourceInstance: report.proposedSourceInstance.sourceInstanceId.slice(0, 12),
    paragraphDriftCounts: counts,
  };
}

function findRequiredTool(name) {
  const result = spawnSync("which", [name], { encoding: "utf8" });
  return result.status === 0 && result.stdout.trim() ? result.stdout.trim() : null;
}

function runTool(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    const detail = (result.stderr || result.stdout || result.error?.message || "unknown error").trim();
    throw new Error(`${label} failed: ${detail}`);
  }
  return result;
}

function firstVersionLine(command) {
  const result = runTool(command, ["-v"], `${path.basename(command)} version check`);
  return `${result.stdout}\n${result.stderr}`.split("\n").map((line) => line.trim()).find(Boolean) ?? "unknown";
}

async function syncNlrB(repositoryRoot) {
  validateSyncArguments(process.argv.slice(2));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PUBLIC_SOURCE_TIMEOUT_MS);
  try {
    const fetched = await fetchApprovedNlrB(controller.signal);
    const sections = normalizeApprovedArticleHtml(fetched.bytes.toString("utf8"));
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
      response: { contentType: fetched.contentType, byteCount: fetched.byteCount, sha256: responseHash },
      normalized: { sha256: normalizedHash, sectionCount: sections.length, sections },
    };
    const cachePath = writeNlrBCache(repositoryRoot, cache);
    process.stdout.write(`${JSON.stringify({
      result: "PASS", sourceId: PUBLIC_SOURCE_ID, approvedUrl: PUBLIC_SOURCE_URL, finalUrl: fetched.finalUrl,
      contentType: fetched.contentType, byteCount: fetched.byteCount, responseSha256: responseHash,
      normalizedSha256: normalizedHash, retrievedAt, sectionCount: sections.length,
      sectionIds: sections.map((section) => section.id), cachePath,
    }, null, 2)}\n`);
  } finally {
    clearTimeout(timer);
  }
}

async function syncCba(repositoryRoot) {
  validateCbaSyncArguments(process.argv.slice(2));
  const tools = validatePopplerToolAvailability(findRequiredTool("pdfinfo"), findRequiredTool("pdftotext"));
  const pdfinfoVersion = firstVersionLine(tools.pdfinfoPath);
  const pdftotextVersion = firstVersionLine(tools.pdftotextPath);
  const cacheDirectory = ensureCacheDirectory(repositoryRoot);
  const pdfPath = path.join(repositoryRoot, CBA_PDF_CACHE_RELATIVE_PATH);
  const jsonPath = path.join(repositoryRoot, CBA_JSON_CACHE_RELATIVE_PATH);
  const temporaryPdf = path.join(cacheDirectory, ".apwu-usps-cba-2024-2027.pdf.tmp");
  const temporaryTextOne = path.join(cacheDirectory, ".apwu-usps-cba-2024-2027.extract-1.tmp");
  const temporaryTextTwo = path.join(cacheDirectory, ".apwu-usps-cba-2024-2027.extract-2.tmp");
  const temporaryJson = path.join(cacheDirectory, ".apwu-usps-cba-2024-2027.json.tmp");
  const temporaryPaths = [temporaryPdf, temporaryTextOne, temporaryTextTwo, temporaryJson];
  temporaryPaths.forEach((target) => { if (existsSync(target)) rmSync(target); });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CBA_TIMEOUT_MS);
  try {
    const fetched = await fetchApprovedCba(controller.signal);
    writeFileSync(temporaryPdf, fetched.bytes, { flag: "wx", mode: 0o600 });
    const pdfInfo = runTool(tools.pdfinfoPath, [temporaryPdf], "pdfinfo").stdout;
    const pageCount = Number.parseInt(/^Pages:\s+(\d+)$/im.exec(pdfInfo)?.[1] ?? "0", 10);
    validateCbaPageCount(pageCount);

    const extractionArgs = ["-layout", "-enc", "UTF-8", temporaryPdf];
    runTool(tools.pdftotextPath, [...extractionArgs, temporaryTextOne], "first pdftotext extraction");
    runTool(tools.pdftotextPath, [...extractionArgs, temporaryTextTwo], "second pdftotext extraction");
    const extractedOne = readFileSync(temporaryTextOne, "utf8");
    const extractedTwo = readFileSync(temporaryTextTwo, "utf8");
    const normalizedOne = normalizeExtractedCbaText(extractedOne, (value) => sha256(value));
    const normalizedTwo = normalizeExtractedCbaText(extractedTwo, (value) => sha256(value));
    if (normalizedOne.sha256 !== normalizedTwo.sha256 || JSON.stringify(normalizedOne) !== JSON.stringify(normalizedTwo)) {
      throw new Error("Repeated CBA extraction did not produce byte-identical normalized output.");
    }
    const extractedSegments = extractedOne.replace(/\r\n?/g, "\n").split("\f");
    if (extractedSegments.at(-1)?.trim() === "") extractedSegments.pop();
    validateCbaPageCount(extractedSegments.length);
    const nonEmptyPageCount = extractedSegments.filter((page) => page.trim().length > 0).length;
    const retrievedAt = new Date().toISOString();
    const responseHash = sha256(fetched.bytes);
    const cache = {
      schema: CBA_CACHE_SCHEMA,
      source: {
        id: CBA_SOURCE_ID,
        title: CBA_SOURCE_TITLE,
        owner: CBA_SOURCE_OWNER,
        sourcePageUrl: CBA_SOURCE_PAGE_URL,
        pdfUrl: CBA_SOURCE_PDF_URL,
        finalUrl: validateCbaFinalUrl(fetched.finalUrl),
        sourceClass: CBA_SOURCE_CLASS,
        documentStatus: CBA_DOCUMENT_STATUS,
        sensitivity: CBA_SOURCE_SENSITIVITY,
        accessMode: CBA_SOURCE_ACCESS_MODE,
        effectiveStart: CBA_EFFECTIVE_START,
        effectiveEnd: CBA_EFFECTIVE_END,
        controllingForCoveredEmployees: CBA_CONTROLLING_SCOPE,
        scopeRequiresFactMatch: CBA_SCOPE_REQUIRES_FACT_MATCH,
        legalAdvice: CBA_LEGAL_ADVICE,
        readOnly: true,
      },
      retrievedAt,
      response: { contentType: fetched.contentType, byteCount: fetched.byteCount, sha256: responseHash, redirectChain: fetched.redirectChain },
      extraction: {
        tool: "pdftotext", toolVersion: pdftotextVersion, pdfinfoVersion, pageCount: CBA_EXPECTED_PDF_PAGES,
        characterCount: extractedOne.length, nonEmptyPageCount, emptyPageCount: CBA_EXPECTED_PDF_PAGES - nonEmptyPageCount,
        pageDelimiterCount: (extractedOne.match(/\f/g) ?? []).length, sha256: sha256(extractedOne),
      },
      normalized: normalizedOne,
    };
    const existingCache = readExistingCbaCache(jsonPath);
    if (existingCache) {
      const overwriteGuard = evaluateCbaSourceOverwriteGuard({ current: existingCache, proposed: cache });
      if (!overwriteGuard.allowed) {
        process.stdout.write(JSON.stringify({ result: "REVIEW_REQUIRED", overwrite: "blocked", ...boundedDriftSummary(overwriteGuard.report) }, null, 2) + "\\n");
        throw new Error("CBA source instance changed or is incompatible; accepted cache was not overwritten. Exact expected source-instance hashes and explicit operator approval are required for any future override.");
      }
    }
    writeFileSync(temporaryJson, `${JSON.stringify(cache, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
    renameSync(temporaryPdf, pdfPath);
    chmodSync(pdfPath, 0o600);
    renameSync(temporaryJson, jsonPath);
    chmodSync(jsonPath, 0o600);
    process.stdout.write(`${JSON.stringify({
      result: "PASS", sourceId: CBA_SOURCE_ID, sourcePageUrl: CBA_SOURCE_PAGE_URL, approvedPdfUrl: CBA_SOURCE_PDF_URL,
      finalUrl: fetched.finalUrl, redirectChain: fetched.redirectChain, retrievedAt, contentType: fetched.contentType,
      byteCount: fetched.byteCount, responseSha256: responseHash, pageCount, extractionTool: pdftotextVersion,
      pdfinfoVersion, extractionSha256: cache.extraction.sha256, normalizedSha256: normalizedOne.sha256,
      characterCount: cache.extraction.characterCount, nonEmptyPageCount, emptyPageCount: cache.extraction.emptyPageCount,
      pageDelimiterCount: cache.extraction.pageDelimiterCount, articleCount: normalizedOne.articleCount,
      sectionCount: normalizedOne.sectionCount, paragraphCount: normalizedOne.paragraphCount,
      structureCount: normalizedOne.structureCount, extractionRuns: 2, normalizedOutputsByteIdentical: true,
      pdfPath, cachePath: jsonPath,
    }, null, 2)}\n`);
  } finally {
    clearTimeout(timer);
    temporaryPaths.forEach((target) => { if (existsSync(target)) rmSync(target); });
  }
}

async function main() {
  const repositoryRoot = assertRepositoryRoot();
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === CBA_SOURCE_ID) await syncCba(repositoryRoot);
  else await syncNlrB(repositoryRoot);
}

main().catch((error) => {
  const aborted = error?.name === "AbortError";
  const message = aborted ? "Approved source fetch timed out." : error instanceof Error ? error.message : "Public source sync failed.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
