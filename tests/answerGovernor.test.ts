import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GET as healthGET } from "@/app/health/route";
import VersionPage from "@/app/version/page";
import { buildAnswer } from "@/lib/answerGovernor";
import { corpus } from "@/lib/sourceModel";
import { createRuntimeVersion, runtimeVersionFields } from "@/lib/version";
import {
  applyVaultAction,
  assertFakeMetadataOnly,
  createInitialVaultState,
  exportVaultAuditJson,
  exportVaultAuditMarkdown,
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
    expect(answer.footer).toContain("Build:");
    expect(answer.footer).toContain("Mode:Strict Research");
    expect(answer.version.displayVersion).toMatch(/^0\.4\.0-dev\.\d{8}\+(?:[a-z0-9]+|unknown)$/);
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

describe("runtime build identity", () => {
  it("formats displayVersion from product milestone, channel, UTC build date, and git SHA", () => {
    const version = createRuntimeVersion({
      productVersion: "0.4.0",
      channel: "dev",
      buildDate: "20260620",
      gitSha: "c33c049",
      corpusVersion: "corpus.test",
      indexVersion: "index.test",
      promptVersion: "prompt.test",
      provider: "provider.test",
    });

    expect(version.displayVersion).toBe("0.4.0-dev.20260620+c33c049");
    expect(version.productVersion).toBe("0.4.0");
    expect(version.corpusVersion).toBe("corpus.test");
    expect(version.indexVersion).toBe("index.test");
  });

  it("exposes every build identity field through /health", async () => {
    const response = healthGET();
    const payload = await response.json();

    for (const field of runtimeVersionFields) {
      expect(payload).toHaveProperty(field);
      expect(payload.version).toHaveProperty(field);
      expect(payload[field]).toBe(payload.version[field]);
    }

    expect(payload.version.displayVersion).toMatch(/^0\.4\.0-dev\.\d{8}\+(?:[a-z0-9]+|unknown)$/);
    expect(payload.version.corpusVersion).toBe(corpus.corpusVersion);
    expect(payload.version.indexVersion).toBe(corpus.indexVersion);
  });

  it("renders full build metadata on the /version page", () => {
    const html = renderToStaticMarkup(VersionPage());

    expect(html).toContain("Build Identity");
    expect(html).toContain("Display Version");
    expect(html).toContain("Product Version");
    expect(html).toContain("Build Date");
    expect(html).toContain("Git SHA");
    expect(html).toContain("Corpus");
    expect(html).toContain("Index");
    expect(html).toContain("Prompt");
    expect(html).toContain("Provider");
    expect(html).toMatch(/0\.4\.0-dev\.\d{8}\+(?:[a-z0-9]+|unknown)/);
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
    expect(record?.workflowState).toBe("quarantine_only");
    expect(advanced.auditLog[0].action).toBe("advance_fake_gate");
    expect(advanced.auditLog[0].note).toContain("no file content was accessed");
  });

  it("blocks invalid transitions with visible reasons", () => {
    const state = createInitialVaultState();
    const blocked = applyVaultAction(state, {
      type: "advance",
      recordId: "fake-vault-member-only",
      targetStep: "metadata_review",
      now: "2026-06-20T01:30:00.000Z",
    });

    const record = blocked.records.find((item) => item.id === "fake-vault-member-only");

    expect(record?.lifecycleStep).toBe("redaction_review");
    expect(record?.workflowState).toBe("redaction_required");
    expect(record?.lastBlockedReason).toContain("redaction review must be approved");
    expect(blocked.auditLog[0].action).toBe("blocked_invalid_transition");
  });

  it("requires redaction and metadata review before fake eligibility", () => {
    const state = createInitialVaultState();
    const redactionApproved = applyVaultAction(state, {
      type: "approve_redaction",
      recordId: "fake-vault-member-only",
      now: "2026-06-20T02:00:00.000Z",
    });
    const movedToMetadata = applyVaultAction(redactionApproved, {
      type: "advance",
      recordId: "fake-vault-member-only",
      now: "2026-06-20T02:01:00.000Z",
    });
    const metadataApproved = applyVaultAction(movedToMetadata, {
      type: "approve_metadata",
      recordId: "fake-vault-member-only",
      now: "2026-06-20T02:02:00.000Z",
    });
    const eligible = applyVaultAction(metadataApproved, {
      type: "advance",
      recordId: "fake-vault-member-only",
      now: "2026-06-20T02:03:00.000Z",
    });

    const record = eligible.records.find((item) => item.id === "fake-vault-member-only");

    expect(record?.lifecycleStep).toBe("index_eligibility");
    expect(record?.redactionStatus).toBe("approved_redacted");
    expect(record?.metadataStatus).toBe("reviewed");
    expect(record?.workflowState).toBe("eligible_fake_only");
    expect(eligible.auditLog.map((entry) => entry.action)).toContain("approve_fake_redaction");
    expect(eligible.auditLog.map((entry) => entry.action)).toContain("approve_fake_metadata");
  });

  it("tracks rejected reviews as not indexable states", () => {
    const state = createInitialVaultState();
    const rejected = applyVaultAction(state, {
      type: "reject_review",
      recordId: "fake-vault-member-only",
      reason: "Fake reviewer found unresolved redaction flags.",
      now: "2026-06-20T02:10:00.000Z",
    });

    const record = rejected.records.find((item) => item.id === "fake-vault-member-only");

    expect(record?.workflowState).toBe("review_rejected");
    expect(record?.lastBlockedReason).toContain("unresolved redaction flags");
    expect(rejected.auditLog[0].action).toBe("reject_fake_review");
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
    expect(blocked.auditLog[0].note).not.toContain("/media/mint/SHARED/APWU");
  });

  it("exports fake audit JSON and Markdown with build identity and no private paths", () => {
    const state = createInitialVaultState();
    const version = createRuntimeVersion({
      productVersion: "0.4.0",
      buildDate: "20260620",
      gitSha: "dd4b997",
    });
    const json = exportVaultAuditJson(state, version, "2026-06-20T03:00:00.000Z");
    const markdown = exportVaultAuditMarkdown(state, version, "2026-06-20T03:00:00.000Z");
    const payload = JSON.parse(json);

    expect(payload.version.displayVersion).toBe("0.4.0-dev.20260620+dd4b997");
    expect(payload.guard.fakeMetadataOnly).toBe(true);
    expect(payload.guard.privatePathsIncluded).toBe(false);
    expect(payload.records[0]).not.toHaveProperty("lastBlockedReason");
    expect(json).toContain("eligible_fake_only");
    expect(markdown).toContain("Display version: 0.4.0-dev.20260620+dd4b997");
    expect(json).not.toContain("/media/mint/SHARED/APWU");
    expect(markdown).not.toContain("/media/mint/SHARED/APWU");
  });
});
