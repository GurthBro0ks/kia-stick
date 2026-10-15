import { createHash } from "node:crypto";
import path from "node:path";
import { realPublicDataAvailable, realPublicDataDirectory, realPublicDataReason, realPublicDataStatus, realPublicDataPermissionProblem } from "@/tests/fixtures/realPublicDataPrerequisite";
import { readFileSync } from "node:fs";
import { PINNED_CBA_PDF_SHA256 } from "@/tests/fixtures/cbaSourceIdentityFixture";
import { describe, expect, it } from "vitest";

const matrixV2Path = "docs/public-source-sufficiency-matrix-v2.md";
const matrixV1Path = "docs/public-steward-workflow-source-matrix.md";


const matrixV2 = readFileSync(matrixV2Path, "utf8");
const matrixV1 = readFileSync(matrixV1Path, "utf8");

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

const RESEARCH_ONLY_IDS = [
  "seniority_assignment_administration",
  "hours_work_scheduling",
  "craft_jurisdiction",
  "training_qualification",
];

describe("Public source-sufficiency matrix v2 does not fetch or mutate any source", () => {
  it("does not claim any source fetch/sync/refresh/replacement was performed", () => {
    expect(matrixV2).toMatch(/no source (was )?fetch|no fetch, sync/i);
  });

  it("carries the exact pinned CBA PDF hash", () => {
    expect(matrixV2).toContain(PINNED_CBA_PDF_SHA256);
  });
});

describe("Public source-sufficiency matrix v2 reaffirms Part A without contradicting v1", () => {
  it("carries forward all ten supported topics as unchanged/PASS", () => {
    for (const topicId of SUPPORTED_TOPIC_IDS) {
      expect(matrixV2).toContain(topicId);
    }
    expect(matrixV2).toMatch(/unchanged, `PASS`|unchanged and `PASS`|unchanged, PASS/);
  });

  it("keeps every v1 research-only/rejected id unpromoted in v2", () => {
    for (const id of RESEARCH_ONLY_IDS) {
      expect(matrixV1).toContain(id);
      expect(matrixV2).toContain(id);
    }
    expect(matrixV2).toContain("grievance_procedure_timeliness");
    expect(matrixV2.toLowerCase()).not.toMatch(
      /hours_work_scheduling.{0,80}\bsupported\b(?!.{0,20}(no|not|research))/i
    );
  });
});

describe("Public source-sufficiency matrix v2 fail-closes the contact-directory gap", () => {
  it("marks contact-directory / escalation-contact sourcing as insufficient or research-only", () => {
    expect(matrixV2).toMatch(/contact-directory/i);
    expect(matrixV2).toMatch(/research required|research_only|insufficient/i);
  });

  it("does not supply any concrete external contact URL or agency address", () => {
    expect(matrixV2).not.toMatch(/https?:\/\//);
  });
});

describe("Public source-sufficiency matrix v2 aligns with the selected Bundle 3 scope", () => {
  it("references the final candidate matrix and decision documents", () => {
    expect(matrixV2).toContain("public-steward-workflow-platform-bundle-3-candidate-matrix.md");
    expect(matrixV2).toContain("public-steward-workflow-platform-bundle-3-decision.md");
  });

  it("states the source-sufficiency gate result for the selected bundle", () => {
    expect(matrixV2).toMatch(/PASS/);
  });
});

if (realPublicDataStatus === "unusable") {
  it("opt-in prerequisite: KIA_REAL_PUBLIC_DATA_DIR supplied but unusable", () => {
    throw new Error(realPublicDataReason);
  });
}

if (realPublicDataStatus === "not_supplied") console.info(`NOT_RUN: matrix v2 live CBA cache hash: ${realPublicDataReason}`);

if (realPublicDataStatus === "unsafe" || realPublicDataStatus === "ready") {
  it("opt-in prerequisite: supplied cache has safe permissions (dir 0700, files 0600, owned by current uid)", () => {
    if (realPublicDataStatus === "unsafe") throw new Error(realPublicDataReason);
    expect(realPublicDataPermissionProblem(realPublicDataDirectory!)).toBeUndefined();
  });
}

describe.runIf(realPublicDataAvailable)("matrix v2 live CBA cache hash (opt-in; requires KIA_REAL_PUBLIC_DATA_DIR)", () => {
  it("carries the real CBA PDF SHA256 and matches the pinned identity", () => {
    const hash = createHash("sha256").update(readFileSync(path.join(realPublicDataDirectory!, "apwu-usps-cba-2024-2027.pdf"))).digest("hex");
    expect(matrixV2).toContain(hash);
    expect(hash).toBe(PINNED_CBA_PDF_SHA256);
  });
});
