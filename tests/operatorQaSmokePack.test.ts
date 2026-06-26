import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.7.9-fake-only-operator-qa-smoke-pack";
const docPath = "docs/v0.7.9-operator-qa-smoke-pack.md";
const scriptPath = "scripts/operator-qa-smoke.mjs";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";

describe("v0.7.9 fake-only operator QA smoke pack", () => {
  it("documents every required operator smoke surface", () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain(`Product version: \`${productVersion}\``);
    expect(doc).toContain(`Prompt version: \`${promptVersion}\``);

    for (const surface of ["Chat", "Sources", "Saved", "Upload", "Import", "Vault", "Settings", "`/health`", "`/version`", "Mobile / Narrow View"]) {
      expect(doc).toContain(surface);
    }

    for (const expected of [
      "fake answer/save/no-answer",
      "fake source IDs",
      "citable/context labels",
      "Saved detail state",
      "fake metadata buttons only",
      "deterministic blocked action",
      "never imply index approval",
      "productVersion",
      "displayVersion",
      "promptVersion",
      "provider",
      "buildDate",
      "gitSha",
      "Bottom nav remains visible",
    ]) {
      expect(doc).toContain(expected);
    }
  });

  it("keeps fake-only boundaries explicit and queue-015 blocked", () => {
    const doc = readFileSync(docPath, "utf8");
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string; next_action: string }>;
    };

    const realDocGate = queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request");
    const smokePack = queue.items.find((item) => item.id === "queue-023-v079-operator-qa-smoke-pack");

    expect(realDocGate?.status).toBe("blocked");
    expect(smokePack?.phase).toBe(phase);
    expect(smokePack?.status).toBe("accepted");
    expect(`${smokePack?.next_action}`).toContain("operator:smoke");

    for (const forbidden of [
      "file pickers",
      "directory pickers",
      "drag/drop import zones",
      "path readers",
      "real upload handlers",
      "OCR",
      "embeddings",
      "vector stores",
      "real quarantine",
      "real redaction",
      "real indexing",
      "services",
      "secrets",
    ]) {
      expect(doc).toContain(forbidden);
    }

    expect(doc).toContain("does **not** approve real-doc work");
    expect(doc).toContain("exactly one gate");
    expect(doc).toContain("exactly one document");
  });

  it("adds a no-new-dependency local smoke helper and npm script", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
    const script = readFileSync(scriptPath, "utf8");

    expect(packageJson.scripts["operator:smoke"]).toBe("node scripts/operator-qa-smoke.mjs");
    expect(script).toContain("http://127.0.0.1:3000");
    expect(script).toContain("--base-url");
    expect(script).toContain("--require-server");
    expect(script).toContain("loopback");
    expect(script).not.toContain("https://api.");
    expect(script).not.toContain("https://www.");

    for (const forbidden of [
      "file pickers",
      "private paths",
      "real upload",
      "OCR",
      "indexing",
      "vector stores",
      "showOpenFilePicker",
      "webkitdirectory",
      "FileReader",
      "createReadStream",
      "/media/mint",
      "kia-stick-private-vault",
    ]) {
      expect(script).not.toContain(forbidden);
    }
  });

  it("runs the helper in static mode and rejects non-local URLs", () => {
    const pass = spawnSync("node", [scriptPath, "--base-url", "http://127.0.0.1:9"], { encoding: "utf8" });
    expect(pass.status).toBe(0);
    expect(pass.stdout).toContain("Operator QA smoke PASS");
    expect(pass.stdout).toContain("local_route_checks=SKIPPED_SERVER_UNAVAILABLE");

    const reject = spawnSync("node", [scriptPath, "--base-url", "https://example.com"], { encoding: "utf8" });
    expect(reject.status).not.toBe(0);
    expect(reject.stderr).toContain("Base URL must stay on loopback");
  });

  it("advances feature state without changing product or prompt identity", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      release_readiness: {
        phase: string;
        product_version: string;
        package_version: string;
        prompt_version: string;
      };
      v078_v07_release_state_closeout: {
        status: string;
        accepted_commit: string;
      };
      v079_operator_qa_smoke_pack: {
        phase: string;
        status: string;
        product_version: string;
        package_version: string;
        prompt_version: string;
        queue_015_status: string;
        queue_022_status: string;
        queue_023_status: string;
        authorizes_real_doc_work: boolean;
        real_document_access: boolean;
        private_vault_inspected: boolean;
        runtime_ui_changed: boolean;
      };
    };

    expect(featureList.phase).toBe(phase);
    expect(featureList.release_readiness.phase).toBe(phase);
    expect(featureList.release_readiness.product_version).toBe(productVersion);
    expect(featureList.release_readiness.package_version).toBe(productVersion);
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);
    expect(featureList.v078_v07_release_state_closeout.status).toBe("accepted_after_push_verified");
    expect(featureList.v078_v07_release_state_closeout.accepted_commit).toBe("b28a803");
    expect(featureList.v079_operator_qa_smoke_pack.phase).toBe(phase);
    expect(featureList.v079_operator_qa_smoke_pack.status).toBe("accepted_after_push_verified");
    expect(featureList.v079_operator_qa_smoke_pack.product_version).toBe(productVersion);
    expect(featureList.v079_operator_qa_smoke_pack.package_version).toBe(productVersion);
    expect(featureList.v079_operator_qa_smoke_pack.prompt_version).toBe(promptVersion);
    expect(featureList.v079_operator_qa_smoke_pack.queue_015_status).toBe("blocked");
    expect(featureList.v079_operator_qa_smoke_pack.queue_022_status).toBe("accepted_after_push_verified");
    expect(featureList.v079_operator_qa_smoke_pack.queue_023_status).toBe("accepted_after_push_verified");
    expect(featureList.v079_operator_qa_smoke_pack.authorizes_real_doc_work).toBe(false);
    expect(featureList.v079_operator_qa_smoke_pack.real_document_access).toBe(false);
    expect(featureList.v079_operator_qa_smoke_pack.private_vault_inspected).toBe(false);
    expect(featureList.v079_operator_qa_smoke_pack.runtime_ui_changed).toBe(false);
  });
});
