import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateSyntheticApprovalPacket } from "@/lib/syntheticApprovalPacketValidator";
import { summarizeSyntheticPacketFixtureMatrix, syntheticPacketFixtureMatrix } from "@/lib/syntheticPacketFixtures";

const phase = "KIA-Stick-v0.7.17-synthetic-packet-fixture-matrix";
const currentPhase = "KIA-Stick-v0.9.10-synthetic-governance-hardening-checkpoint";
const docPath = "docs/v0.7.17-synthetic-packet-fixture-matrix.md";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";

describe("v0.7.17 synthetic packet fixture matrix", () => {
  it("documents a synthetic-only in-memory fixture matrix", () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain(`Product version: \`${productVersion}\``);
    expect(doc).toContain(`Prompt version: \`${promptVersion}\``);
    expect(doc).toContain("synthetic objects only");
    expect(doc).toContain("does not accept user-supplied paths");
    expect(doc).toContain("does not add a packet file loader");
    expect(doc).toContain("queue-015-v07-first-real-doc-gate-request` remains blocked");
  });

  it("covers PASS, WARN, and required FAIL classes", () => {
    const summary = summarizeSyntheticPacketFixtureMatrix();

    expect(summary.total).toBeGreaterThanOrEqual(10);
    expect(summary.pass).toBeGreaterThanOrEqual(1);
    expect(summary.warn).toBeGreaterThanOrEqual(1);
    expect(summary.warn).toBeGreaterThanOrEqual(3);
    expect(summary.fail).toBeGreaterThanOrEqual(12);
    expect(summary.unsafeClasses).toEqual(
      expect.arrayContaining([
        "path-shaped",
        "private-path-wording",
        "recursive",
        "too-broad-scope",
        "broad-source",
        "private-source",
        "queue-015-unblock",
        "multiple-docs",
        "multiple-gates",
        "missing-rollback",
        "unsafe-proof-output",
        "upload-ocr-indexing-vector",
      ])
    );
  });

  it("validates every fixture to its expected PASS/WARN/FAIL status", () => {
    for (const fixture of syntheticPacketFixtureMatrix) {
      const result = validateSyntheticApprovalPacket(fixture.packet);
      expect(result.status, fixture.id).toBe(fixture.expectedStatus);
      expect(result.reasons.map((reason) => reason.code), fixture.id).toEqual(expect.arrayContaining(fixture.expectedReasonCodes));
      expect(result.guard).toMatchObject({
        syntheticFieldsOnly: true,
        acceptsPathArguments: false,
        readsUserFiles: false,
        scansDirectories: false,
      });
    }
  });

  it("keeps feature and queue state review-only without changing product or prompt identity", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      release_readiness: { phase: string; product_version: string; package_version: string; prompt_version: string };
      v0717_synthetic_packet_fixture_matrix: {
        phase: string;
        status: string;
        queue_015_status: string;
        queue_032_status: string;
        real_document_access: boolean;
        reads_user_files: boolean;
        accepts_path_arguments: boolean;
        packet_file_loader_added: boolean;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string; summary: string; next_action: string }>;
    };
    const q015 = queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request");
    const q032 = queue.items.find((item) => item.id === "queue-032-v0717-synthetic-packet-fixture-matrix");

    expect(featureList.phase).toBe(currentPhase);
    expect(featureList.release_readiness.phase).toBe(currentPhase);
    expect(featureList.release_readiness.package_version).toBe(productVersion);
    expect(featureList.release_readiness.product_version).toBe(productVersion);
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);
    expect(featureList.v0717_synthetic_packet_fixture_matrix.phase).toBe(phase);
    expect(featureList.v0717_synthetic_packet_fixture_matrix.status).toBe("accepted_after_closeout_push");
    expect(featureList.v0717_synthetic_packet_fixture_matrix.queue_015_status).toBe("blocked");
    expect(featureList.v0717_synthetic_packet_fixture_matrix.queue_032_status).toBe("accepted");
    expect(featureList.v0717_synthetic_packet_fixture_matrix.real_document_access).toBe(false);
    expect(featureList.v0717_synthetic_packet_fixture_matrix.reads_user_files).toBe(false);
    expect(featureList.v0717_synthetic_packet_fixture_matrix.accepts_path_arguments).toBe(false);
    expect(featureList.v0717_synthetic_packet_fixture_matrix.packet_file_loader_added).toBe(false);
    expect(q015?.status).toBe("blocked");
    expect(q032?.phase).toBe(phase);
    expect(q032?.status).toBe("accepted");
    expect(`${q032?.summary}\n${q032?.next_action}`).toContain("synthetic-only");
    expect(`${q032?.summary}\n${q032?.next_action}`).toContain("queue-015 remains blocked");
  });

  it("does not add file picker, packet loader, path reader, upload, OCR, indexing, or vector implementation", () => {
    const fixtureSource = readFileSync("lib/syntheticPacketFixtures.ts", "utf8");
    const doc = readFileSync(docPath, "utf8");

    expect(fixtureSource).not.toMatch(/\bprocess\.argv\b|\bcreateReadStream\b|\breaddirSync\b|\bexistsSync\b|\bstatSync\b/);
    expect(fixtureSource).not.toMatch(/<input[^>]*type=["']file|showOpenFilePicker|showDirectoryPicker|FileReader|readAsText|readAsArrayBuffer/i);
    expect(fixtureSource).not.toMatch(/\bmulter\b|\buploadHandler\b|\brunOcr\b|\bcreateVectorStore\b|\bVectorStore\.from\b/);
    expect(doc).toContain("does not add a packet file loader");
  });
});
