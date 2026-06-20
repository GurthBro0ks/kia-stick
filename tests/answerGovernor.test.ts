import { describe, expect, it } from "vitest";
import { buildAnswer } from "@/lib/answerGovernor";
import { corpus } from "@/lib/sourceModel";
import {
  applyVaultAction,
  assertFakeMetadataOnly,
  createInitialVaultState,
  vaultLanes,
} from "@/lib/vaultModel";

const baseOptions = {
  mode: "Strict Research" as const,
  scope: "All Fake" as const,
  detail: "Detailed" as const,
};

describe("fake corpus", () => {
  it("contains every source class required by the MVP", () => {
    for (const sourceClass of corpus.sourceClasses) {
      expect(corpus.docs.some((doc) => doc.class === sourceClass)).toBe(true);
    }
  });

  it("keeps every document fake-bannered", () => {
    for (const doc of corpus.docs) {
      expect(doc.body).toContain(corpus.requiredBanner);
    }
  });
});

describe("answer governor", () => {
  it("uses controlling fake language for annual leave", () => {
    const answer = buildAnswer("Can annual leave be denied after I submitted inside the fake window?", baseOptions);

    expect(answer.noAnswer).toBe(false);
    expect(answer.bestGuessDisabled).toBe(false);
    expect(answer.citations.some((citation) => citation.class === "controlling_contract_language")).toBe(true);
    expect(answer.footer).toContain("Sources:");
    expect(answer.footer).toContain("Mode:Strict Research");
  });

  it("blocks best guess for Step 1 evidence when no controlling language is present", () => {
    const answer = buildAnswer("What evidence belongs in a Step 1 fake file?", baseOptions);

    expect(answer.noAnswer).toBe(true);
    expect(answer.shortAnswer).toBe("I could not find controlling language for that exact issue.");
    expect(answer.bestGuessDisabled).toBe(true);
    expect(answer.evidenceChecklist).toContain("Issue statement");
  });

  it("keeps unknown one-click lunch rumor out of citable proof", () => {
    const answer = buildAnswer("Can I grieve a one-click lunch scanner issue?", baseOptions);

    expect(answer.noAnswer).toBe(true);
    expect(answer.relatedFakeSections.some((citation) => citation.class === "unknown_unverified")).toBe(true);
    expect(answer.citations.every((citation) => citation.citable)).toBe(true);
    expect(answer.conflicts.join(" ")).toContain("unverified");
  });
});

describe("fake vault governance model", () => {
  it("ships fake metadata fixtures for every vault lane", () => {
    const state = createInitialVaultState();

    for (const lane of vaultLanes) {
      expect(state.records.some((record) => record.lane === lane)).toBe(true);
    }
    expect(assertFakeMetadataOnly(state.records).ok).toBe(true);
  });

  it("advances lifecycle gates with audit entries but does not make quarantine indexable", () => {
    const state = createInitialVaultState();
    const advanced = applyVaultAction(state, {
      type: "advance",
      recordId: "fake-vault-quarantine",
      now: "2026-06-20T01:00:00.000Z",
    });

    const record = advanced.records.find((item) => item.id === "fake-vault-quarantine");

    expect(record?.lifecycleStep).toBe("hash_provenance");
    expect(record?.indexEligibility).toBe("not_eligible");
    expect(advanced.auditLog[0].action).toBe("advance_fake_gate");
    expect(advanced.auditLog[0].note).toContain("no file content was accessed");
  });

  it("blocks vault actions carrying real paths or raw content fields", () => {
    const state = createInitialVaultState();
    const blocked = applyVaultAction(state, {
      type: "advance",
      recordId: "fake-vault-quarantine",
      privatePath: "/media/mint/SHARED/APWU/private.pdf",
      rawText: "do not accept content",
      now: "2026-06-20T02:00:00.000Z",
    });

    const record = blocked.records.find((item) => item.id === "fake-vault-quarantine");

    expect(record?.lifecycleStep).toBe("quarantine");
    expect(blocked.auditLog[0].action).toBe("blocked_real_file_access");
    expect(blocked.auditLog[0].note).toContain("forbidden private reference");
    expect(blocked.auditLog[0].note).toContain("forbidden file/content field");
  });
});
