import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const auditPath = "docs/public-steward-workflow-platform-bundle-3-current-state-audit.md";
const matrixPath = "docs/public-steward-workflow-platform-bundle-3-candidate-matrix.md";
const decisionPath = "docs/public-steward-workflow-platform-bundle-3-decision.md";
const packetPath = "docs/public-steward-workflow-platform-bundle-3-implementation-packet.md";

const audit = readFileSync(auditPath, "utf8");
const matrix = readFileSync(matrixPath, "utf8");
const decision = readFileSync(decisionPath, "utf8");
const packet = readFileSync(packetPath, "utf8");

const SUPPORTED_TOPIC_IDS = [
  "annual_leave",
  "overtime",
  "holiday_scheduling",
  "safety_health",
  "discipline_just_cause",
  "sick_leave",
  "higher_level_assignments",
  "uniforms_work_clothes",
  "employee_claims",
  "steward_grievance_handling",
];

function readRuntimeSources(): string {
  const roots = ["app", "components", "lib"];
  const candidates = [
    "app/health/route.ts",
    "app/version/page.tsx",
    "app/api/public-source/route.ts",
    "app/api/public-cba-source/route.ts",
    "components/KiaStickApp.tsx",
    "lib/publicStewardWorkflowRegistry.ts",
    "lib/publicGrievanceOutline.ts",
    "lib/publicStewardPacket.ts",
    "lib/publicArgumentPlan.ts",
    "lib/savedAnswers.ts",
  ];

  const files: string[] = [];
  for (const file of candidates) {
    expect(roots.some((root) => file.startsWith(`${root}/`))).toBe(true);
    expect(existsSync(file)).toBe(true);
    files.push(readFileSync(file, "utf8"));
  }
  return files.join("\n");
}

describe("Bundle 3 current-state audit is grounded in actual source", () => {
  it("names the exact ten supported topic ids", () => {
    for (const topicId of SUPPORTED_TOPIC_IDS) {
      expect(audit).toContain(topicId);
    }
  });

  it("cites the real registry, outline, packet, and Saved architecture by file", () => {
    for (const reference of [
      "lib/publicStewardWorkflowRegistry.ts",
      "lib/publicGrievanceOutline.ts",
      "lib/publicStewardPacket.ts",
      "lib/savedAnswers.ts",
      "lib/publicCitationIntegrity.ts",
      "lib/publicArgumentPlan.ts",
      "detectPublicStewardWorkflowTopic",
      "publicStewardWorkflowMatch",
      "verified_current",
    ]) {
      expect(audit).toContain(reference);
    }
  });

  it("documents the two real limitations that motivate Bundle 3", () => {
    expect(audit).toContain("No step-by-step argument builder for any of the 10 CBA topics");
    expect(audit).toContain("No packet sequencing or completion tracking");
  });
});

describe("Bundle 3 candidate matrix ranks candidates with evidence and selects one bundle", () => {
  it("scores candidates against the required criteria", () => {
    for (const criterion of [
      "Steward usefulness",
      "Source sufficiency",
      "Implementation risk",
      "Privacy risk",
      "Architecture fit",
      "Testability",
      "Mobile usability",
      "Dependency risk",
    ]) {
      expect(matrix).toContain(criterion);
    }
  });

  it("selects exactly the five bounded candidates and explicitly defers the rest", () => {
    expect(matrix).toContain("Topic-Grounded Argument & Evidence");
    expect(matrix).toContain("not selected — research-only, deferred");
    expect(matrix).toContain("not selected this bundle");
    expect(matrix).toContain("not selected — already shipped");
  });

  it("does not select the contact-directory or new-supported-topic candidates", () => {
    expect(matrix).toContain("Public contact-directory architecture");
    expect(matrix).toMatch(/not selected[\s\S]{0,40}research-only, deferred/);
  });
});

describe("Bundle 3 decision is a single coherent, bounded scope statement", () => {
  it("names the exact phase and lists the five included features", () => {
    expect(decision).toContain("Topic-Grounded Argument & Evidence Preparation");
    expect(decision).toContain("Per-topic step-by-step argument plans");
    expect(decision).toContain("Structured evidence/document-request checklist");
    expect(decision).toContain("Packet sequencing and completion tracking");
    expect(decision).toContain("Escalation-guidance strengthening within existing sources only");
    expect(decision).toContain("Print-friendly export polish");
  });

  it("explicitly excludes contact-directory, new topics, and private data", () => {
    expect(decision).toContain("Public contact-directory architecture");
    expect(decision).toContain("Reusable public-only workflow templates");
    expect(decision).toContain("Any private-data capability, secure file transfer, upload endpoint, file picker");
  });

  it("preserves the required blocked states", () => {
    expect(decision).toContain("queue-015-v07-first-real-doc-gate-request");
    expect(decision).toContain("v0.9.12C");
    expect(decision).toContain("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(decision).toContain("0.7.0");
  });

  it("does not approve private-data implementation", () => {
    expect(decision).toContain("Not approved");
  });
});

describe("Bundle 3 implementation packet is actionable without repeating discovery", () => {
  it("defines the exact future phase name and required boundaries", () => {
    expect(packet).toContain(
      "KIA-Stick-public-steward-workflow-platform-bundle-3-topic-argument-plans-and-evidence-checklists"
    );
    expect(packet).toContain("Source boundary");
    expect(packet).toContain("Accepted-state boundary");
    expect(packet).toContain("Data model changes");
    expect(packet).toContain("Routing changes");
    expect(packet).toContain("UI changes");
    expect(packet).toContain("Saved changes");
    expect(packet).toContain("Export changes");
    expect(packet).toContain("Required tests");
    expect(packet).toContain("Browser / manual QA");
    expect(packet).toContain("Rollback");
    expect(packet).toContain("Proof expectations");
    expect(packet).toContain("Package immutability expectations");
    expect(packet).toContain("Source-cache immutability expectations");
    expect(packet).toContain("Commit strategy");
    expect(packet).toContain("No-push gate");
    expect(packet).toContain("Operator-QA gate");
    expect(packet).toContain("Closeout/push gate");
  });

  it("does not touch data/current-accepted-pushed-state.json and does not authorize closeout or push", () => {
    expect(packet).toContain("Do not touch `data/current-accepted-pushed-state.json`");
    expect(packet).toContain("This packet does not request or");
    expect(packet).toContain("perform closeout or push");
  });

  it("requires no new package and no new source", () => {
    expect(packet).toContain("No change to `package.json`/`package-lock.json`");
    expect(packet).toContain("No change to any file under `.kia-public-data/`");
  });
});

describe("Bundle 3 planning does not add any real capability to the current runtime", () => {
  it("keeps all four planning documents in PLAN ONLY status", () => {
    for (const doc of [audit, matrix, decision, packet]) {
      expect(doc.toLowerCase()).not.toMatch(/\bstatus: implemented\b/);
    }
    expect(decision).toContain("PLAN ONLY");
    expect(packet).toContain("PLAN ONLY");
  });

  it("does not add file input, path reader, or upload/import runtime code paths", () => {
    const runtime = readRuntimeSources();
    expect(runtime).not.toMatch(/<input[^>]*type=["']file/i);
    expect(runtime).not.toMatch(/\bshowOpenFilePicker\b/);
    expect(runtime).not.toMatch(/\bwebkitdirectory\b/);
    expect(runtime).not.toMatch(/\bFileReader\b/);
    expect(runtime).not.toMatch(/\breadAsText\b|\breadAsArrayBuffer\b/);
  });

  it("keeps the ten-topic registry exactly as audited, with no new topic id added", () => {
    const registry = readFileSync("lib/publicStewardWorkflowRegistry.ts", "utf8");
    for (const topicId of SUPPORTED_TOPIC_IDS) {
      expect(registry).toContain(`"${topicId}"`);
    }
    const idMatches = registry.match(/export type PublicStewardWorkflowTopicId =[\s\S]*?;/);
    expect(idMatches).not.toBeNull();
    const idBlock = idMatches?.[0] ?? "";
    for (const topicId of SUPPORTED_TOPIC_IDS) {
      expect(idBlock).toContain(topicId);
    }
  });
});
