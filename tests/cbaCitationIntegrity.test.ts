import { describe, expect, it } from "vitest";
import { buildCbaAnswer } from "@/lib/cbaAnswer";
import {
  CBA_CITATION_ANCHOR_ALGORITHM_VERSION,
  CBA_PARAGRAPH_HASH_ALGORITHM_VERSION,
  CBA_SOURCE_INSTANCE_ALGORITHM_VERSION,
  canonicalJson,
  compareCbaSourceInstances,
  deriveCbaCitationIntegrity,
  deriveCbaSourceInstance,
  evaluateCbaSourceOverwriteGuard,
  normalizeCbaParagraphForHash,
  paragraphContentSha256,
  verifyCbaCitation,
} from "@/lib/cbaCitationIntegrity";
import type { CbaSourceCache } from "@/lib/cbaSource";
import { createSavedAnswerRecord, migrateSavedAnswers } from "@/lib/savedAnswers";
import { createCbaSourceFixtureCache } from "@/tests/fixtures/cbaSourceFixture";
import { createRuntimeVersion } from "@/lib/version";

const runtimeVersion = createRuntimeVersion({ buildDate: "20260721", gitSha: "citation-integrity" });

function cloneCache(source = createCbaSourceFixtureCache()): CbaSourceCache {
  return JSON.parse(JSON.stringify(source)) as CbaSourceCache;
}

function firstCbaCitation(source = createCbaSourceFixtureCache()) {
  const answer = buildCbaAnswer({
    question: "What does Article 15 say?",
    source,
    nlrbSource: null,
    runtimeVersion,
    mode: "Strict Research",
    scope: "Official-Like",
    detail: "Detailed",
  });
  expect(answer.noAnswer).toBe(false);
  return { source, answer, citation: answer.citations[0] };
}

describe("CBA citation source-instance integrity", () => {
  it("derives stable source instances and paragraph hashes", () => {
    const source = createCbaSourceFixtureCache();
    const first = deriveCbaSourceInstance(source);
    const timestampOnly = cloneCache(source);
    timestampOnly.retrievedAt = "2030-01-01T00:00:00.000Z";
    expect(deriveCbaSourceInstance(timestampOnly).sourceInstanceId).toBe(first.sourceInstanceId);
    expect(first.sourceInstanceAlgorithmVersion).toBe(CBA_SOURCE_INSTANCE_ALGORITHM_VERSION);
    expect(canonicalJson({ b: "two", a: ["one", null] })).toBe(canonicalJson({ a: ["one", null], b: "two" }));
    expect(paragraphContentSha256("Section 2.\r\n  Fourteen (14) days;")).toBe(paragraphContentSha256("Section 2. Fourteen (14) days;"));
    expect(normalizeCbaParagraphForHash("Section 2.\r\n  Fourteen (14) days;")).toBe("Section 2. Fourteen (14) days;");
    expect(paragraphContentSha256("Fourteen (14) days.")).not.toBe(paragraphContentSha256("Fourteen (15) days."));
  });

  it("changes source instance when content or extraction identity changes", () => {
    const source = createCbaSourceFixtureCache();
    const current = deriveCbaSourceInstance(source).sourceInstanceId;
    const variants: Array<(cache: CbaSourceCache) => void> = [
      (cache) => { cache.response.sha256 = "a".repeat(64); },
      (cache) => { cache.normalized.sha256 = "b".repeat(64); },
      (cache) => { cache.extraction.toolVersion = "pdftotext changed"; },
      (cache) => { (cache as unknown as { schema: string }).schema = "kia-public-cba-cache.v2"; },
    ];
    for (const change of variants) {
      const candidate = cloneCache(source);
      change(candidate);
      expect(deriveCbaSourceInstance(candidate).sourceInstanceId).not.toBe(current);
    }
    expect(deriveCbaSourceInstance(source, { normalizationAlgorithmVersion: "cba-normalization.v2" }).sourceInstanceId).not.toBe(current);
  });

  it("binds readable locator fields into a deterministic anchor", () => {
    const source = createCbaSourceFixtureCache();
    const target = source.normalized.pages.flatMap((page) => page.paragraphs).find((item) => item.articleNumber === "15")!;
    const current = deriveCbaCitationIntegrity(source, target);
    expect(current.paragraphHashAlgorithmVersion).toBe(CBA_PARAGRAPH_HASH_ALGORITHM_VERSION);
    expect(current.citationAnchorAlgorithmVersion).toBe(CBA_CITATION_ANCHOR_ALGORITHM_VERSION);
    expect(deriveCbaCitationIntegrity(source, target)).toEqual(current);
    expect(deriveCbaCitationIntegrity(source, { ...target, text: target.text + " Changed." }).citationAnchorSha256).not.toBe(current.citationAnchorSha256);
    expect(deriveCbaCitationIntegrity(source, { ...target, pdfPageNumber: target.pdfPageNumber + 1 }).citationAnchorSha256).not.toBe(current.citationAnchorSha256);
  });

  it("verifies current citations and returns explicit stale states", () => {
    const { source, citation } = firstCbaCitation();
    expect(verifyCbaCitation(citation, source).state).toBe("verified_current");

    const sourceChanged = cloneCache(source);
    sourceChanged.response.sha256 = "c".repeat(64);
    expect(verifyCbaCitation(citation, sourceChanged).state).toBe("source_instance_changed");

    const paragraphChanged = cloneCache(source);
    const changed = paragraphChanged.normalized.pages.flatMap((page) => page.paragraphs).find((item) => item.id === citation.paragraphId)!;
    changed.text += " Changed.";
    expect(verifyCbaCitation(citation, paragraphChanged).state).toBe("paragraph_changed");

    const missing = cloneCache(source);
    const missingPage = missing.normalized.pages.find((page) => page.paragraphs.some((item) => item.id === citation.paragraphId))!;
    missingPage.paragraphs = missingPage.paragraphs.filter((item) => item.id !== citation.paragraphId);
    expect(verifyCbaCitation(citation, missing).state).toBe("paragraph_missing");

    expect(verifyCbaCitation({ ...citation, pdfPageNumber: (citation.pdfPageNumber ?? 0) + 1 }, source).state).toBe("locator_changed");
    expect(verifyCbaCitation({ ...citation, sourceInstanceId: "invalid" }, source).state).toBe("invalid_metadata");
    expect(verifyCbaCitation(citation, null).state).toBe("cache_unavailable");

    const legacy = { ...citation };
    delete legacy.sourceInstanceId;
    delete legacy.sourceInstanceAlgorithmVersion;
    delete legacy.paragraphContentSha256;
    delete legacy.paragraphHashAlgorithmVersion;
    delete legacy.citationAnchorSha256;
    delete legacy.citationAnchorAlgorithmVersion;
    expect(verifyCbaCitation(legacy, source).state).toBe("legacy_unverifiable");
  });

  it("fails closed for duplicate current paragraph matches", () => {
    const { source, citation } = firstCbaCitation();
    const duplicate = cloneCache(source);
    const target = duplicate.normalized.pages.flatMap((page) => page.paragraphs).find((item) => item.id === citation.paragraphId)!;
    const page = duplicate.normalized.pages.find((item) => item.paragraphs.some((candidate) => candidate.id === citation.paragraphId))!;
    page.paragraphs = page.paragraphs
      .filter((item) => item.id !== citation.paragraphId)
      .concat([{ ...target, id: "duplicate-one" }, { ...target, id: "duplicate-two" }]);
    expect(verifyCbaCitation(citation, duplicate).state).toBe("ambiguous_duplicate");
  });

  it("keeps new Saved CBA metadata complete and legacy records readable without fabrication", () => {
    const { answer } = firstCbaCitation();
    expect(answer.citations.every((citation) => citation.citationVerificationState === "verified_current")).toBe(true);
    const saved = createSavedAnswerRecord({
      answer,
      mode: "Strict Research",
      scope: "Official-Like",
      detail: "Detailed",
      timestamp: "2026-07-21T13:00:00.000Z",
    });
    expect(saved.sourceInstanceId).toMatch(/^[a-f0-9]{64}$/);
    expect(saved.paragraphContentSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(saved.citationAnchorSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(saved.citationVerificationStateAtSave).toBe("verified_current");

    const legacy = JSON.parse(JSON.stringify(saved)) as Record<string, unknown>;
    for (const field of [
      "sourceInstanceId",
      "sourceInstanceAlgorithmVersion",
      "paragraphContentSha256",
      "paragraphHashAlgorithmVersion",
      "citationAnchorSha256",
      "citationAnchorAlgorithmVersion",
      "citationVerificationStateAtSave",
    ]) delete legacy[field];
    for (const legacyCitation of legacy.citations as Array<Record<string, unknown>>) {
      for (const field of [
        "sourceInstanceId",
        "sourceInstanceAlgorithmVersion",
        "paragraphContentSha256",
        "paragraphHashAlgorithmVersion",
        "citationAnchorSha256",
        "citationAnchorAlgorithmVersion",
        "citationVerificationState",
      ]) delete legacyCitation[field];
    }
    const beforeMigration = JSON.stringify(legacy);
    const migrated = migrateSavedAnswers([legacy]);
    expect(JSON.stringify(legacy)).toBe(beforeMigration);
    expect(migrated[0].sourceInstanceId).toBeUndefined();
    expect(verifyCbaCitation(migrated[0].citations[0], createCbaSourceFixtureCache()).state).toBe("legacy_unverifiable");
  });

  it("classifies synthetic drift without relying on array positions and blocks overwrite by default", () => {
    const current = createCbaSourceFixtureCache();
    expect(compareCbaSourceInstances(current, cloneCache(current)).sourceState).toBe("source_unchanged");

    const metadata = cloneCache(current);
    metadata.retrievedAt = "2030-01-01T00:00:00.000Z";
    expect(compareCbaSourceInstances(current, metadata).sourceState).toBe("metadata_only_change");

    const tool = cloneCache(current);
    tool.extraction.toolVersion = "pdftotext changed";
    expect(compareCbaSourceInstances(current, tool).sourceState).toBe("extraction_tool_change");
    expect(compareCbaSourceInstances(current, cloneCache(current), {
      currentNormalizationAlgorithmVersion: "cba-normalization.v1",
      proposedNormalizationAlgorithmVersion: "cba-normalization.v2",
    }).sourceState).toBe("normalization_version_change");

    const moved = cloneCache(current);
    moved.normalized.pages[0].paragraphs[0].id = "cba-pdf-p001-p99";
    expect(compareCbaSourceInstances(current, moved).paragraphDrift.some((item) => item.state === "paragraph_moved")).toBe(true);

    const changed = cloneCache(current);
    changed.normalized.pages[0].paragraphs[0].text = "Synthetic changed paragraph.";
    expect(compareCbaSourceInstances(current, changed).paragraphDrift.some((item) => item.state === "paragraph_changed")).toBe(true);

    const removed = cloneCache(current);
    removed.normalized.pages[0].paragraphs.shift();
    expect(compareCbaSourceInstances(current, removed).paragraphDrift.some((item) => item.state === "paragraph_removed")).toBe(true);

    const added = cloneCache(current);
    added.normalized.pages[0].paragraphs.push({ ...added.normalized.pages[0].paragraphs[0], id: "cba-pdf-p001-p99", text: "Synthetic added paragraph." });
    expect(compareCbaSourceInstances(current, added).paragraphDrift.some((item) => item.state === "paragraph_added")).toBe(true);

    const duplicate = cloneCache(current);
    duplicate.normalized.pages[0].paragraphs[0].id = "cba-pdf-p001-p98";
    duplicate.normalized.pages[0].paragraphs.push({ ...current.normalized.pages[0].paragraphs[0], id: "cba-pdf-p001-p99" });
    expect(compareCbaSourceInstances(current, duplicate).paragraphDrift.some((item) => item.state === "ambiguous_duplicate")).toBe(true);

    const incompatible = cloneCache(current);
    (incompatible as unknown as { schema: string }).schema = "incompatible";
    expect(compareCbaSourceInstances(current, incompatible).sourceState).toBe("incompatible_schema");

    const changedSource = cloneCache(current);
    changedSource.response.sha256 = "e".repeat(64);
    const blocked = evaluateCbaSourceOverwriteGuard({ current, proposed: changedSource });
    expect(blocked.allowed).toBe(false);
    expect(blocked.requiresExactExpectedHashes).toBe(true);
    expect(evaluateCbaSourceOverwriteGuard({
      current,
      proposed: changedSource,
      expectedCurrentSourceInstanceId: blocked.report.currentSourceInstance.sourceInstanceId,
      expectedProposedSourceInstanceId: blocked.report.proposedSourceInstance.sourceInstanceId,
      operatorApprovedExactHashes: true,
    }).allowed).toBe(true);
  });
});
