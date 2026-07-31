import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const planPath = "docs/user-owned-knowledge-base-secure-file-transfer-gate-plan.md";
const plan = readFileSync(planPath, "utf8");

const NON_NEGOTIABLE_PRINCIPLES = [
  "Private data is default-deny.",
  "A user owns and controls their private workspace.",
  "Public and private source lanes remain visibly separate.",
  "No private content is sent to an external model without a later explicit gate.",
  "No secret or private content enters Git, proof output, logs, screenshots, or notifications.",
  "Deletion must be real, testable, and documented.",
];

const REQUIRED_ARCHITECTURE_AREAS = [
  "Per-user isolation",
  "Authentication and authorization boundaries",
  "Encrypted transport",
  "Encryption at rest",
  "Key ownership and rotation",
  "Upload quarantine",
  "Malware / content safety scanning",
  "Content-type and file-size restrictions",
  "Metadata minimization",
  "Local versus server-side processing",
  "Source provenance",
  "Citation anchoring",
  "Duplicate detection",
  "Versioning",
  "User-created reusable workflows",
  "User-created argument and interview plans",
  "Retention",
  "Deletion",
  "Export",
  "Backup",
  "Restore",
  "Audit logging",
  "Private-data redaction",
  "Model-access boundaries",
  "External-AI restrictions",
  "Support/admin access",
  "Incident response",
  "Secret handling",
  "Cross-user data leakage prevention",
  "Public versus private source separation",
  "Rollback",
  "Proof-safe testing",
];

const FUTURE_APPROVAL_SEQUENCE = [
  "threat model PASS",
  "authentication/authorization design PASS",
  "encryption/key design PASS",
  "retention/deletion design PASS",
  "backup/restore design PASS",
  "logging/proof-safety design PASS",
  "one bounded private-data pilot approved",
  "operator QA PASS",
  "closeout PASS",
];

const NEVER_IMPLEMENT_LIST = [
  "authentication",
  "upload endpoints",
  "file pickers",
  "FileReader",
  "path readers",
  "object storage",
  "databases",
  "encryption",
  "OCR",
  "embeddings",
  "vector databases",
  "private search",
  "private LLM access",
  "user accounts",
  "sharing",
  "public deployment",
  "contact synchronization",
];

function readRuntimeSources(): string {
  const roots = ["app", "components", "lib"];
  const candidates = [
    "app/health/route.ts",
    "app/layout.tsx",
    "app/page.tsx",
    "app/version/page.tsx",
    "app/api/public-source/route.ts",
    "app/api/public-cba-source/route.ts",
    "components/KiaStickApp.tsx",
    "lib/publicStewardWorkflowRegistry.ts",
    "lib/publicStewardPacket.ts",
    "lib/publicGrievanceOutline.ts",
    "lib/redactionMetadataModel.ts",
    "lib/savedAnswers.ts",
    "lib/vaultModel.ts",
    "lib/importWizardModel.ts",
  ];

  const files: string[] = [];
  for (const file of candidates) {
    expect(roots.some((root) => file.startsWith(`${root}/`))).toBe(true);
    expect(existsSync(file)).toBe(true);
    files.push(readFileSync(file, "utf8"));
  }
  return files.join("\n");
}

describe("Secure knowledge boundary plan is explicitly planning-only", () => {
  it("declares PLAN ONLY status and that nothing is implemented by writing it", () => {
    expect(plan).toContain("Status: `PLAN ONLY`");
    expect(plan).toContain("Nothing in this document is implemented, wired, enabled, or approved by writing it.");
  });

  it("does not change accepted-state identity", () => {
    expect(plan).toContain("does not change `data/current-accepted-pushed-state.json`");
  });
});

describe("Secure knowledge boundary plan preserves the six non-negotiable principles verbatim", () => {
  it.each(NON_NEGOTIABLE_PRINCIPLES)("states: %s", (principle) => {
    expect(plan).toContain(principle);
  });
});

describe("Secure knowledge boundary plan covers every required architecture area", () => {
  it.each(REQUIRED_ARCHITECTURE_AREAS)("addresses: %s", (area) => {
    expect(plan).toContain(area);
  });

  it("uses the four-bucket legend consistently", () => {
    for (const bucket of [
      "PLAN NOW",
      "IMPLEMENT PUBLIC-ONLY NEXT",
      "IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE",
      "NEVER ALLOW",
    ]) {
      expect(plan).toContain(bucket);
    }
  });
});

describe("Secure knowledge boundary plan defines the future private-data approval sequence in order", () => {
  it("lists every required approval step", () => {
    for (const step of FUTURE_APPROVAL_SEQUENCE) {
      expect(plan).toContain(step);
    }
  });

  it("keeps the steps in the required order", () => {
    const positions = FUTURE_APPROVAL_SEQUENCE.map((step) => plan.indexOf(step));
    for (const position of positions) expect(position).toBeGreaterThan(-1);
    for (let i = 1; i < positions.length; i += 1) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });
});

describe("Secure knowledge boundary plan never authorizes private-data implementation now", () => {
  it("lists every forbidden-now capability", () => {
    for (const forbidden of NEVER_IMPLEMENT_LIST) {
      expect(plan).toContain(forbidden);
    }
    expect(plan).toContain("What This Plan Does Not Authorize");
  });

  it("references, and does not duplicate or contradict, the existing real-doc gate series", () => {
    for (const existingDoc of [
      "docs/v0.6-future-implementation-gate-draft.md",
      "docs/v0.6-real-doc-safety-checklist.md",
      "docs/v0.6-local-redaction-policy-plan.md",
      "docs/v0.6-operator-approval-packet.md",
      "docs/v0.6-real-doc-pilot-plan.md",
    ]) {
      expect(plan).toContain(existingDoc);
      expect(existsSync(existingDoc)).toBe(true);
    }
  });

  it("references the private-vault directory name only, never its contents", () => {
    expect(plan).toContain("kia-stick-private-vault");
    expect(plan).toContain("outside Git, untouched by this phase");
    expect(plan).not.toMatch(/kia-stick-private-vault\/[^\s`]+/);
  });

  it("does not overlap with Bundle 3's reusable-template scope decision", () => {
    expect(plan).toContain("deliberately deferred it past Bundle 3");
  });
});

describe("Secure knowledge boundary plan adds no real capability to the current runtime", () => {
  it("does not add file input, file picker, path reader, or upload-handling code", () => {
    const runtime = readRuntimeSources();
    expect(runtime).not.toMatch(/<input[^>]*type=["']file/i);
    expect(runtime).not.toMatch(/\bshowOpenFilePicker\b/);
    expect(runtime).not.toMatch(/\bwebkitdirectory\b/);
    expect(runtime).not.toMatch(/\bFileReader\b/);
    expect(runtime).not.toMatch(/\breadAsText\b|\breadAsArrayBuffer\b/);
    expect(runtime).not.toMatch(/\brealDocPilot\b|\breadRealDocument\b|\bquarantineRealDocument\b|\brunOcr\b|\bcreateVectorStore\b/);
  });

  it("does not add authentication or object-storage runtime code", () => {
    const runtime = readRuntimeSources();
    expect(runtime).not.toMatch(/\bnext-auth\b|\bpassport\b|\bjsonwebtoken\b/i);
    expect(runtime).not.toMatch(/\bcreateSession\b|\bloginUser\b|\bauthenticateUser\b/);
  });

  it("keeps the existing forbidden-fragment guard in lib/redactionMetadataModel.ts unchanged in kind", () => {
    const redactionModel = readFileSync("lib/redactionMetadataModel.ts", "utf8");
    for (const fragment of [
      "/media/mint/SHARED/APWU",
      "kia-stick-private-vault",
      "data/real-documents",
      "data/quarantine",
      "data/redacted-approved",
      "uploads/",
      "exports/",
      "backups/",
      "vector-store/",
      "DB/",
    ]) {
      expect(redactionModel).toContain(fragment);
    }
  });
});
