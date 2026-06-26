import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.8.2-v07-v08-backlog-reconciliation";
const docPath = "docs/v0.8.2-v07-v08-backlog-reconciliation.md";

describe("v0.8.2 v0.7-v0.8 backlog reconciliation", () => {
  it("records evidence-based decisions for queue-011 through queue-014", () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    for (const id of [
      "queue-011-v07-pause-stabilize",
      "queue-012-v07-product-version-bump-plan",
      "queue-013-v07-fake-only-ux-polish",
      "queue-014-v07-real-doc-gate-preparation",
    ]) {
      expect(doc).toContain(id);
    }
    expect(doc).toContain("No item is marked accepted without a documented evidence chain");
    expect(doc).toContain("planning-only/synthetic preparation");
  });

  it("uses only allowed queue statuses and preserves the blocked real-doc request", () => {
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; status: string; summary: string; next_action: string }>;
    };
    const allowed = new Set(["planned", "running", "needs_review", "ready_to_push", "accepted", "blocked", "parked"]);

    for (const item of queue.items) expect(allowed.has(item.status)).toBe(true);
    expect(queue.items.find((item) => item.id === "queue-011-v07-pause-stabilize")?.status).toBe("accepted");
    expect(queue.items.find((item) => item.id === "queue-012-v07-product-version-bump-plan")?.status).toBe("accepted");
    expect(queue.items.find((item) => item.id === "queue-013-v07-fake-only-ux-polish")?.status).toBe("accepted");
    expect(queue.items.find((item) => item.id === "queue-014-v07-real-doc-gate-preparation")?.status).toBe("accepted");

    const q015 = queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request");
    expect(q015?.status).toBe("blocked");
    expect(`${q015?.summary}\n${q015?.next_action}`).toContain("exactly one document");
    expect(`${q015?.summary}\n${q015?.next_action}`).toContain("exactly one gate");
  });

  it("keeps real-doc preparation separate from implementation approval", () => {
    const doc = readFileSync(docPath, "utf8");
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; summary: string; next_action: string }>;
    };
    const q014 = queue.items.find((item) => item.id === "queue-014-v07-real-doc-gate-preparation");
    const text = `${doc}\n${q014?.summary}\n${q014?.next_action}`;

    expect(text).toContain("does not authorize any document touch");
    expect(text).toContain("no real-doc implementation is approved");
    expect(text).not.toMatch(/<input[^>]*type=["']file|showOpenFilePicker|showDirectoryPicker|FileReader|readAsText|readAsArrayBuffer/i);
    expect(text).not.toMatch(/\bmulter\b|\buploadHandler\b|\brunOcr\b|\bcreateVectorStore\b|\bVectorStore\.from\b/);
  });
});
