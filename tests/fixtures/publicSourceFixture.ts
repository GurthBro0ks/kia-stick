import { createHash } from "node:crypto";
import {
  normalizeApprovedArticleHtml,
  normalizedContentForHash,
  PUBLIC_SOURCE_ACCESS_MODE,
  PUBLIC_SOURCE_CACHE_SCHEMA,
  PUBLIC_SOURCE_CLASS,
  PUBLIC_SOURCE_CONTROLLING_FOR_USPS,
  PUBLIC_SOURCE_ID,
  PUBLIC_SOURCE_OWNER,
  PUBLIC_SOURCE_POSTAL_APPLICABILITY,
  PUBLIC_SOURCE_SENSITIVITY,
  PUBLIC_SOURCE_TITLE,
  PUBLIC_SOURCE_URL,
  type PublicSourceCache,
} from "@/lib/publicSource";

export const syntheticNlrBHtml = `<!doctype html>
<html><head><title>Fixture</title><script>discard me</script></head><body>
<nav>Unrelated navigation</nav>
<main><article>
<div class="field field--name-body field--type-text-with-summary">
  <p>Section 7 protects represented employees in this synthetic public fixture.</p>
  <p><strong>When do employees have a right to request a union representative?</strong></p>
  <p>An investigatory interview occurs when a manager is seeking to question an employee.</p>
  <p>The questioning is part of an investigation into the employee's performance or work conduct.</p>
  <ul>
    <li>The employee reasonably believes the investigation may result in discharge, discipline, or another adverse consequence.</li>
    <li>The employee requests a union representative.</li>
  </ul>
  <h2>What may a union representative do during an employee interview?</h2>
  <p>Union representatives serve as advisors and witnesses during employee interviews.</p>
  <p>A representative may clarify questions, give limited advice, and provide additional information after questioning.</p>
  <h2>What are the limitations?</h2>
  <p>A representative must remain civil and may not interfere with legitimate efforts to conduct an investigation.</p>
  <p>A representative may not tell an employee what to say and may not advise false answers.</p>
  <p>This page has not been reviewed or approved by the Board and may be subject to qualifications.</p>
</div>
</article></main><footer>Unrelated footer</footer>
</body></html>`;

export function fixtureSha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createPublicSourceFixtureCache(): PublicSourceCache {
  const sections = normalizeApprovedArticleHtml(syntheticNlrBHtml);
  return {
    schema: PUBLIC_SOURCE_CACHE_SCHEMA,
    source: {
      id: PUBLIC_SOURCE_ID,
      title: PUBLIC_SOURCE_TITLE,
      owner: PUBLIC_SOURCE_OWNER,
      url: PUBLIC_SOURCE_URL,
      finalUrl: PUBLIC_SOURCE_URL,
      sourceClass: PUBLIC_SOURCE_CLASS,
      sensitivity: PUBLIC_SOURCE_SENSITIVITY,
      accessMode: PUBLIC_SOURCE_ACCESS_MODE,
      postalApplicability: PUBLIC_SOURCE_POSTAL_APPLICABILITY,
      controllingForUsps: PUBLIC_SOURCE_CONTROLLING_FOR_USPS,
      readOnly: true,
    },
    retrievedAt: "2026-07-17T12:00:00.000Z",
    response: {
      contentType: "text/html; charset=UTF-8",
      byteCount: Buffer.byteLength(syntheticNlrBHtml),
      sha256: fixtureSha256(syntheticNlrBHtml),
    },
    normalized: {
      sha256: fixtureSha256(normalizedContentForHash(sections)),
      sectionCount: sections.length,
      sections,
    },
  };
}
