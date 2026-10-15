import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isReleaseGateGo,
  validateReleaseGateRecord,
  type ReleaseGateContext,
  type ReleaseGateRecord,
} from "@/lib/releaseGateRecord";
import { validateSyntheticApprovalPacket } from "@/lib/syntheticApprovalPacketValidator";

const SHA = "a".repeat(40);
const PRIOR = "b".repeat(40);
const OTHER = "c".repeat(40);
const TIP = "2026-10-15T18:00:00Z";

function rollback(over: Record<string, unknown> = {}) {
  return {
    priorSha: PRIOR,
    trigger: "/health checkpoint mismatch, served SHA mismatch, or failed smoke check",
    authorizer: "runner may execute on trigger; re-deploy needs a fresh GO from Gurth",
    runner: "KIA Builder",
    steps: ["git checkout " + PRIOR, "restart via approved runbook"],
    verify: "/health reports checkpoint and served SHA equal to priorSha",
    dataImpact: "none: code-only change, no data/ writes",
    ...over,
  };
}

function record(over: Partial<ReleaseGateRecord> = {}): ReleaseGateRecord {
  return {
    approvalId: "appr-001",
    action: "deploy",
    targetSha: SHA,
    host: "kia-prod",
    approver: "Gurth",
    authorKind: "owner_direct",
    source: "Slack ts 1792092789.334689",
    quote: "GO",
    approvedAt: "2026-10-15T19:00:00Z",
    expiresAt: "2026-10-16T19:00:00Z",
    rollback: rollback(),
    ...over,
  };
}

function ctx(over: Partial<ReleaseGateContext> = {}): ReleaseGateContext {
  return {
    now: "2026-10-15T20:00:00Z",
    consumedApprovalIds: [],
    candidate: { action: "deploy", targetSha: SHA, host: "kia-prod", tipCommittedAt: "2026-10-15T18:00:00Z" },
    ...over,
  };
}

const status = (r: unknown, c: unknown = ctx()) => validateReleaseGateRecord(r, c).status;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("releaseGateRecord (advisory, GUR-106 spec v3 §6)", () => {
  it("case 1: no approval text is NOT_GO", () => {
    expect(status(record({ quote: undefined }))).toBe("NOT_GO");
    expect(status(record({ quote: "" }))).toBe("NOT_GO");
  });

  it("case 2: hedged approvals are NOT_GO", () => {
    for (const quote of ["looks reasonable", "probably fine, GO", "sounds good", "I think so", "maybe GO", "should be fine", "GO if you think", "GO ok?"]) {
      expect(status(record({ quote })), quote).toBe("NOT_GO");
    }
  });

  it("case 3: conditional approval is NOT_GO", () => {
    expect(status(record({ quote: "once tests pass, go" }))).toBe("NOT_GO");
    expect(status(record({ quote: "GO after the Reviewer signs off" }))).toBe("NOT_GO");
  });

  it("case 4: relay or agent-only text is NOT_GO", () => {
    for (const authorKind of ["relay", "pm", "agent", "agent_app", undefined]) {
      expect(status(record({ authorKind })), String(authorKind)).toBe("NOT_GO");
    }
    expect(status(record({ approver: "Manny" }))).toBe("NOT_GO");
  });

  it("case 5: different SHA is NOT_GO", () => {
    expect(status(record({ targetSha: OTHER }))).toBe("NOT_GO");
  });

  it("case 6: missing rollback is FAIL", () => {
    expect(status(record({ rollback: undefined }))).toBe("FAIL");
  });

  it("case 7: rollback TBD or empty is FAIL", () => {
    expect(status(record({ rollback: "TBD" }))).toBe("FAIL");
    expect(status(record({ rollback: "" }))).toBe("FAIL");
    expect(status(record({ rollback: {} }))).toBe("FAIL");
    expect(status(record({ rollback: rollback({ steps: "TBD" }) }))).toBe("FAIL");
  });

  it("case 8: unsafe input (path, URL, secret-like token) is FAIL", () => {
    expect(status(record({ source: "/home/box/.ssh/id_ed25519" }))).toBe("FAIL");
    expect(status(record({ source: "see " + "ht" + "tps://example.com/x" }))).toBe("FAIL");
    expect(status(record({ quote: "GO ghp_ABCDEFGHIJKLMNOP" }))).toBe("FAIL");
    expect(status(record({ source: "token=abc123" }))).toBe("FAIL");
    expect(status(record({ source: "../../etc/passwd" }))).toBe("FAIL");
  });

  it("case 9: a valid record is GO", () => {
    const r = validateReleaseGateRecord(record(), ctx());
    expect(r.status).toBe("GO");
    expect(r.advisory).toBe(true);
    expect(isReleaseGateGo(r)).toBe(true);
    expect(status(record({ action: "push", host: undefined, branch: "main" }), ctx({ candidate: { action: "push", targetSha: SHA, branch: "main", tipCommittedAt: TIP } }))).toBe("GO");
  });

  it("case 10: syntheticApprovalPacketValidator is untouched and still importable", () => {
    const src = readFileSync(join(process.cwd(), "lib/syntheticApprovalPacketValidator.ts"));
    expect(createHash("sha256").update(src).digest("hex")).toBe("224a3a09c2e8905b93fd7000ba0d207a620e2d5a7da871a2e21e7ea9be92e5be");
    expect(typeof validateSyntheticApprovalPacket).toBe("function");
  });

  it("case 11: expired or TTL over 24h is NOT_GO", () => {
    expect(status(record(), ctx({ now: "2026-10-16T19:00:01Z" }))).toBe("NOT_GO");
    expect(status(record({ expiresAt: "2026-10-16T19:00:01Z" }))).toBe("NOT_GO");
    expect(status(record({ expiresAt: undefined }))).toBe("NOT_GO");
    expect(status(record({ approvedAt: "2026-10-15T17:00:00Z", expiresAt: "2026-10-16T17:00:00Z" }))).toBe("NOT_GO");
  });

  it("case 12: replay of a consumed approvalId is NOT_GO", () => {
    expect(status(record(), ctx({ consumedApprovalIds: ["appr-001"] }))).toBe("NOT_GO");
    expect(status(record(), ctx({ consumedApprovalIds: ["appr-002"] }))).toBe("GO");
  });

  it("case 13: negated or revoked is NOT_GO; later retraction overrides GO", () => {
    for (const quote of ["no GO", "not approved", "don't deploy yet", "do not merge"]) {
      expect(status(record({ quote })), quote).toBe("NOT_GO");
    }
    expect(status(record({ revocations: [{ targetSha: SHA, action: "deploy", at: "2026-10-15T19:30:00Z", quote: "hold" }] }))).toBe("NOT_GO");
    expect(status(record({ revocations: [{ targetSha: OTHER, action: "deploy", at: "2026-10-15T19:30:00Z" }] }))).toBe("GO");
  });

  it("case 14: prefix SHA or branch-only is AMBIGUOUS and non-GO", () => {
    const pre = validateReleaseGateRecord(record({ targetSha: SHA.slice(0, 7) }), ctx());
    expect(pre.status).toBe("AMBIGUOUS");
    expect(isReleaseGateGo(pre)).toBe(false);
    const br = validateReleaseGateRecord(record({ action: "push", targetSha: undefined, host: undefined, branch: "main" }), ctx());
    expect(br.status).toBe("AMBIGUOUS");
    expect(isReleaseGateGo(br)).toBe(false);
  });

  it("case 15: same SHA but push approved while deploy requested is NOT_GO", () => {
    expect(status(record({ action: "push", host: undefined, branch: "main" }))).toBe("NOT_GO");
    expect(status(record({ quote: "yes, push" }))).toBe("NOT_GO");
  });

  it("case 16: wrong host or branch is NOT_GO", () => {
    expect(status(record({ host: "other-host" }))).toBe("NOT_GO");
    expect(status(record({ action: "merge", host: undefined, branch: "dev" }), ctx({ candidate: { action: "merge", targetSha: SHA, branch: "main", tipCommittedAt: TIP } }))).toBe("NOT_GO");
  });

  it("case 17: missing source citation is FAIL", () => {
    expect(status(record({ source: undefined }))).toBe("FAIL");
    expect(status(record({ source: "  " }))).toBe("FAIL");
  });

  it("case 18: AMBIGUOUS output is never GO", () => {
    for (const r of [record({ targetSha: SHA.slice(0, 12) }), record({ action: ["push", "deploy"] }), record({ host: undefined })]) {
      const out = validateReleaseGateRecord(r, ctx());
      expect(out.status).toBe("AMBIGUOUS");
      expect(isReleaseGateGo(out)).toBe(false);
    }
  });

  it("case 19: partial rollback is FAIL; n/a with a reason is OK", () => {
    expect(status(record({ rollback: rollback({ verify: undefined }) }))).toBe("FAIL");
    expect(status(record({ rollback: rollback({ runner: "" }) }))).toBe("FAIL");
    expect(status(record({ rollback: rollback({ dataImpact: " " }) }))).toBe("FAIL");
    expect(status(record({ rollback: rollback({ dataImpact: "n/a" }) }))).toBe("FAIL");
    expect(status(record({ rollback: rollback({ dataImpact: "none" }) }))).toBe("FAIL");
    expect(status(record({ rollback: rollback({ dataImpact: "n/a: docs-only change touches no stored data" }) }))).toBe("GO");
    expect(status(record({ rollback: rollback({ steps: ["rm -rf data/corpus"] }) }))).toBe("FAIL");
  });

  it("case 20: rollback priorSha equal to targetSha is FAIL", () => {
    expect(status(record({ rollback: rollback({ priorSha: SHA }) }))).toBe("FAIL");
  });

  it("case 21: KIA_ALLOW_PUSH, NODE_ENV or a flag do not change the result", () => {
    const inputs = [record(), record({ quote: "maybe" }), record({ targetSha: SHA.slice(0, 7) }), record({ rollback: undefined })];
    const baseline = inputs.map((r) => status(r));
    vi.stubEnv("KIA_ALLOW_PUSH", "1");
    vi.stubEnv("NODE_ENV", "production");
    const withEnv = inputs.map((r) => status({ ...r, force: true, allowPush: true }, { ...ctx(), force: true, bypass: true }));
    expect(withEnv).toEqual(baseline);
    expect(baseline).toEqual(["GO", "NOT_GO", "AMBIGUOUS", "FAIL"]);
  });

  it("case 22: agent text quoting Gurth's GO is NOT_GO", () => {
    expect(status(record({ authorKind: "agent", quote: 'Gurth said "GO"' }))).toBe("NOT_GO");
  });

  it("case 23: bundled 'approve that work' for deploy is NOT_GO", () => {
    expect(status(record({ quote: "approve that work" }))).toBe("NOT_GO");
    expect(status(record({ quote: "approve that work, GO" }))).toBe("NOT_GO");
  });

  it("case 24: malformed or non-object input is FAIL and does not throw", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    for (const bad of [null, undefined, 42, "GO", [], [record()], cyclic, record({ approvedAt: "not-a-date" })]) {
      expect(() => validateReleaseGateRecord(bad, ctx())).not.toThrow();
      expect(status(bad)).toBe("FAIL");
    }
    expect(status(record(), null)).toBe("FAIL");
    expect(status(record(), { now: "x", consumedApprovalIds: [] })).toBe("FAIL");
  });

  it("case 25: static source grep finds no I/O, network or env access", () => {
    const src = readFileSync(join(process.cwd(), "lib/releaseGateRecord.ts"), "utf8");
    expect(src).not.toMatch(/\bimport\b/);
    expect(src).not.toMatch(/\brequire\s*\(/);
    expect(src).not.toMatch(/["'](node:)?(fs|child_process|net|http|https)["']/);
    expect(src).not.toMatch(/\b(fs|child_process|net|https?)\b/);
    expect(src).not.toMatch(/\bfetch\b/);
    expect(src).not.toMatch(/process\.env/);
    expect(src).not.toMatch(/\bDate\.now\b|new Date\(\)/);
  });

  it("case 26: case and whitespace variants of tokens", () => {
    for (const quote of ["go", "  Go  ", "GO", "Approved", "  APPROVED ", "yes, deploy", "YES,   Deploy", "yes deploy"]) {
      expect(status(record({ quote })), quote).toBe("GO");
    }
    expect(status(record({ quote: "No   go" }))).toBe("NOT_GO");
    expect(status(record({ quote: "NOT\tAPPROVED" }))).toBe("NOT_GO");
  });

  it("case 27: several actions in one record is AMBIGUOUS", () => {
    expect(status(record({ action: ["push", "deploy"] }))).toBe("AMBIGUOUS");
    expect(status(record({ action: "push and deploy" }))).toBe("AMBIGUOUS");
  });

  // Fix round (Reviewer conditions 1-4).
  const FALSE_GO_QUOTES = [
    "don't go",
    "no-go",
    "I won't say GO",
    "approved? no",
    "GO?",
    "GO, but not to prod",
    "go later",
    "GO tomorrow",
    "yes, deploy\u2014just kidding",
    "let's go home",
  ];
  for (const quote of FALSE_GO_QUOTES) {
    it(`case 28: quote ${JSON.stringify(quote)} is never GO (NOT_GO)`, () => {
      const out = validateReleaseGateRecord(record({ quote }), ctx());
      expect(isReleaseGateGo(out)).toBe(false);
      expect(out.status).toBe("NOT_GO");
    });
  }

  it("case 28b: bare affirmatives with the record's own target still GO", () => {
    for (const quote of ["GO.", "GO!", "approved", "yes, deploy", "GO deploy", "GO " + SHA.slice(0, 7), "GO, deploy " + SHA + " to kia-prod"]) {
      expect(status(record({ quote })), quote).toBe("GO");
    }
  });

  it("case 28c: negation and qualifier layers each fire independently (defense in depth)", () => {
    const reasons = (quote: string) => validateReleaseGateRecord(record({ quote }), ctx()).reasons;
    for (const quote of ["no GO", "not approved", "don't go", "no-go", "I won't say GO", "approved? no", "yes, deploy\u2014just kidding"]) {
      expect(reasons(quote), quote).toContain("negated_approval");
    }
    for (const quote of ["GO?", "GO, but not to prod", "go later", "GO tomorrow", "approved? no"]) {
      expect(reasons(quote), quote).toContain("qualified_approval");
    }
  });

  it("case 29: isolated action mismatch is NOT_GO with only action_mismatch", () => {
    const out = validateReleaseGateRecord(
      record({ action: "push", host: undefined, branch: "main" }),
      ctx({ candidate: { action: "deploy", targetSha: SHA, branch: "main", host: "kia-prod", tipCommittedAt: TIP } }),
    );
    expect(out.status).toBe("NOT_GO");
    expect(out.reasons).toEqual(["action_mismatch"]);
  });

  it("case 30: approval dated in the future is NOT_GO with only approved_in_future", () => {
    const out = validateReleaseGateRecord(record({ approvedAt: "2026-10-15T21:00:00Z", expiresAt: "2026-10-16T20:00:00Z" }), ctx());
    expect(out.status).toBe("NOT_GO");
    expect(out.reasons).toEqual(["approved_in_future"]);
  });

  it("case 31: destructive rollback steps are FAIL", () => {
    for (const step of [
      "git clean -fdx",
      "rm -rf build",
      "rm -fr .next",
      "git reset --hard " + PRIOR,
      "git push --force origin main",
      "git push -f origin main",
      "git push origin +" + PRIOR + ":main",
      "git push --force-with-lease origin main",
      "rm -r ./data/x",
    ]) {
      const out = validateReleaseGateRecord(record({ rollback: rollback({ steps: ["git checkout " + PRIOR, step] }) }), ctx());
      expect(out.status, step).toBe("FAIL");
      expect(out.reasons, step).toContain("rollback_destructive_step");
    }
  });

  it("case 32: missing candidate tipCommittedAt is AMBIGUOUS, never GO", () => {
    for (const tipCommittedAt of [undefined, "", "not-a-date"]) {
      const c = ctx();
      const out = validateReleaseGateRecord(record(), { ...c, candidate: { ...c.candidate, tipCommittedAt } });
      expect(out.status, String(tipCommittedAt)).toBe("AMBIGUOUS");
      expect(out.reasons).toContain("candidate_missing_tip_time");
      expect(isReleaseGateGo(out)).toBe(false);
    }
  });
});
