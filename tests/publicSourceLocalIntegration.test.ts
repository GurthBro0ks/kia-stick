import { describe, expect, it } from "vitest";
import { readBoundedPublicSourceCache } from "@/lib/publicSourceServer";
import { buildPublicSourceAnswer } from "@/lib/publicSourceAnswer";
import { PUBLIC_SOURCE_ID, PUBLIC_SOURCE_URL } from "@/lib/publicSource";
import { createRuntimeVersion } from "@/lib/version";

const requireCache = process.env.KIA_REQUIRE_PUBLIC_SOURCE_CACHE === "1";

describe("local exact public-source integration", () => {
  it("loads the one fixed cache or reports safe absence", () => {
    const state = readBoundedPublicSourceCache();
    if (requireCache) expect(state.status).toBe("available");
    if (state.status === "unavailable") {
      expect(state.reason).toBe("cache_missing");
      return;
    }
    expect(state.source.source.id).toBe(PUBLIC_SOURCE_ID);
    expect(state.source.source.url).toBe(PUBLIC_SOURCE_URL);
    expect(state.source.normalized.sectionCount).toBeGreaterThanOrEqual(4);
  });

  it("answers all three demonstrations from real local anchors when present", () => {
    const state = readBoundedPublicSourceCache();
    if (state.status === "unavailable") {
      if (requireCache) expect.fail(`required cache unavailable: ${state.reason}`);
      return;
    }
    const runtimeVersion = createRuntimeVersion({ buildDate: "20260717", gitSha: "80e53c7" });
    const questions = [
      "When may a represented employee request a union representative during an investigatory interview?",
      "What role may the representative play?",
      "Does this source by itself establish the controlling rule for USPS employees?",
    ];
    const answers = questions.map((question) => buildPublicSourceAnswer({
      question,
      source: state.source,
      runtimeVersion,
      mode: "Strict Research",
      scope: "Official-Like",
      detail: "Detailed",
    }));
    expect(answers.every((answer) => !answer.noAnswer)).toBe(true);
    expect(answers.every((answer) => answer.citations.length > 0)).toBe(true);
    expect(answers.flatMap((answer) => answer.citations).every((citation) => citation.sourceId === PUBLIC_SOURCE_ID)).toBe(true);
    expect(answers[2].shortAnswer).toContain("No.");
    expect(answers[2].shortAnswer).toContain("Postal applicability is unverified");
  });
});
