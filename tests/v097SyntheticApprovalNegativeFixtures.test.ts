import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateSyntheticApprovalPacket } from "@/lib/syntheticApprovalPacketValidator";
import { summarizeSyntheticPacketFixtureMatrix, syntheticPacketFixtureMatrix } from "@/lib/syntheticPacketFixtures";

const phase = "KIA-Stick-v0.9.7-synthetic-approval-negative-fixtures";
const docPath = "docs/v0.9.7-synthetic-approval-negative-fixtures.md";

describe("v0.9.7 synthetic approval negative fixtures", () => {
  it("documents the requested negative and edge-case fixture classes", () => {
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    for (const required of [
      "Missing operator signature placeholder",
      "Too-broad scope wording",
      "Recursive source wording",
      "Private/path-shaped wording",
      "Multiple future document placeholders",
      "Multiple future gate placeholders",
      "Missing rollback plan",
      "Missing deletion/retention placeholder",
      "Missing redaction-policy result",
      "Unsafe proof output agreement",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("expands the fixture matrix while preserving PASS/WARN/FAIL semantics", () => {
    const summary = summarizeSyntheticPacketFixtureMatrix();

    expect(summary.total).toBeGreaterThanOrEqual(16);
    expect(summary.pass).toBeGreaterThanOrEqual(1);
    expect(summary.warn).toBeGreaterThanOrEqual(3);
    expect(summary.fail).toBeGreaterThanOrEqual(12);
    expect(summary.unsafeClasses).toEqual(
      expect.arrayContaining([
        "path-shaped",
        "private-path-wording",
        "recursive",
        "too-broad-scope",
        "multiple-docs",
        "multiple-gates",
        "missing-rollback",
        "unsafe-proof-output",
      ])
    );
  });

  it("validates the new fixture classes to their expected statuses and reason codes", () => {
    for (const fixture of syntheticPacketFixtureMatrix) {
      const result = validateSyntheticApprovalPacket(fixture.packet);
      expect(result.status, fixture.id).toBe(fixture.expectedStatus);
      expect(result.reasons.map((reason) => reason.code), fixture.id).toEqual(expect.arrayContaining(fixture.expectedReasonCodes));
      expect(result.guard).toMatchObject({
        syntheticFieldsOnly: true,
        acceptsPathArguments: false,
        readsUserFiles: false,
        scansDirectories: false,
        queue015Status: "blocked",
      });
    }
  });

  it("does not add filesystem, file picker, upload, OCR, indexing, or vector behavior", () => {
    const fixtureSource = readFileSync("lib/syntheticPacketFixtures.ts", "utf8");
    const validatorSource = readFileSync("lib/syntheticApprovalPacketValidator.ts", "utf8");

    expect(fixtureSource).not.toMatch(/\bprocess\.argv\b|\bcreateReadStream\b|\breaddirSync\b|\bexistsSync\b|\bstatSync\b/);
    expect(`${fixtureSource}\n${validatorSource}`).not.toMatch(/showOpenFilePicker|showDirectoryPicker|FileReader|readAsText|readAsArrayBuffer/i);
    expect(`${fixtureSource}\n${validatorSource}`).not.toMatch(/\bmulter\b|\buploadHandler\b|\brunOcr\b|\bcreateVectorStore\b|\bVectorStore\.from\b/);
  });
});
