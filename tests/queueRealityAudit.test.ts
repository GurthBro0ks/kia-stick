import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.8.1-queue-reality-audit";
const docPath = "docs/v0.8.1-queue-reality-audit.md";

describe("v0.8.1 queue reality audit", () => {
  it("documents why queue:next selected stale v0.7 work", () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain("selected the first item whose status was not `accepted`");
    expect(doc).toContain("`queue-011-v07-pause-stabilize`: `planned`");
    expect(doc).toContain("`queue-013-v07-fake-only-ux-polish`: `planned`");
    expect(doc).toContain("`queue-014-v07-real-doc-gate-preparation`: `planned`");
    expect(doc).toContain("`queue-015-v07-first-real-doc-gate-request`: `blocked`");
    expect(doc).toContain("queue schema has no `superseded` or `deferred` status");
  });

  it("keeps the reconciled queue state traceable and queue-015 blocked", () => {
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; status: string; history: Array<{ note: string }> }>;
    };

    for (const id of [
      "queue-011-v07-pause-stabilize",
      "queue-012-v07-product-version-bump-plan",
      "queue-013-v07-fake-only-ux-polish",
      "queue-014-v07-real-doc-gate-preparation",
    ]) {
      const item = queue.items.find((candidate) => candidate.id === id);
      expect(item?.status).toBe("accepted");
      expect(item?.history.at(-1)?.note).toMatch(/v0\.8\.[12]|reconciliation|reconciled/i);
    }

    expect(queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request")?.status).toBe("blocked");
  });

  it("does not approve real-doc capability", () => {
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain("does not approve real-doc implementation");
    expect(doc).toContain("does not read user-provided packet files");
    expect(doc).not.toMatch(/<input[^>]*type=["']file|showOpenFilePicker|showDirectoryPicker|FileReader|readAsText|readAsArrayBuffer/i);
    expect(doc).not.toMatch(/\bmulter\b|\buploadHandler\b|\brunOcr\b|\bcreateVectorStore\b|\bVectorStore\.from\b/);
  });
});
