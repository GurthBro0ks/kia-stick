/**
 * Release gate record validator (GUR-106) -- ADVISORY / OFFLINE ONLY.
 *
 * Pure and deterministic. It does not enforce anything and is not wired into
 * release-check, git_auto_sync, package scripts, CI or hooks. It checks only
 * the fields the record DECLARES. It cannot verify authorship: the Reviewer
 * must re-classify the quoted text against the cited source and attest that
 * the words are Gurth's own. The caller supplies `now` and
 * `consumedApprovalIds`; this module reads no clock, no environment and no
 * files, and never throws.
 */

export type ReleaseGateStatus = "GO" | "NOT_GO" | "AMBIGUOUS" | "FAIL";
export type ReleaseGateAction = "push" | "merge" | "deploy";

export interface ReleaseGateRollback {
  priorSha?: unknown;
  trigger?: unknown;
  authorizer?: unknown;
  runner?: unknown;
  steps?: unknown;
  verify?: unknown;
  dataImpact?: unknown;
}

export interface ReleaseGateRevocation {
  targetSha?: unknown;
  action?: unknown;
  at?: unknown;
  quote?: unknown;
}

export interface ReleaseGateRecord {
  approvalId?: unknown;
  action?: unknown;
  targetSha?: unknown;
  branch?: unknown;
  host?: unknown;
  approver?: unknown;
  /** Declared author kind of the quoted text: only "owner_direct" can be GO. */
  authorKind?: unknown;
  source?: unknown;
  quote?: unknown;
  approvedAt?: unknown;
  expiresAt?: unknown;
  rollback?: unknown;
  revocations?: unknown;
  [extra: string]: unknown;
}

export interface ReleaseGateCandidate {
  action: ReleaseGateAction;
  targetSha: string;
  branch?: string;
  host?: string;
  /** ISO time of the candidate tip commit; approvals older than this are NOT_GO. */
  tipCommittedAt?: string;
}

export interface ReleaseGateContext {
  now: string | number | Date;
  consumedApprovalIds: readonly string[];
  candidate: ReleaseGateCandidate;
  [extra: string]: unknown;
}

export interface ReleaseGateResult {
  status: ReleaseGateStatus;
  reasons: string[];
  advisory: true;
}

export const RELEASE_GATE_MAX_TTL_MS = 24 * 60 * 60 * 1000;
export const RELEASE_GATE_APPROVER = "Gurth";

const FULL_SHA = /^[0-9a-f]{40}$/;
const PREFIX_SHA = /^[0-9a-f]{4,39}$/;
const ACTIONS: readonly ReleaseGateAction[] = ["push", "merge", "deploy"];

const HEDGES = [
  "looks reasonable",
  "probably fine",
  "sounds good",
  "i think so",
  "maybe",
  "should be fine",
  "if you think",
  "ok?",
];
const CONDITIONAL = /\b(once|if|when|after|until|unless|provided|assuming)\b/;
const NEGATION = [
  /\bno\s+go\b/,
  /\bnot\s+(a\s+)?go\b/,
  /\bnot\s+approved\b/,
  /\bunapproved\b/,
  /\b(don'?t|do\s+not|never)\s+(push|merge|deploy)\b/,
  /\bnot\s+yet\b/,
  /\b(hold|stop|cancel|revoke[sd]?|retract(ed)?)\b/,
];
const BUNDLED = /\bapprove\s+(that|this|the|all)\s+(work|stuff|changes)\b/;
const UNSAFE = [
  /(^|[\s"'=(])(\/home|\/root|\/etc|\/media|\/mnt|\/var|~\/)/,
  /\.\.\//,
  /[a-z][a-z0-9+.-]*:\/\//i,
  /\b(ghp|gho|ghs|github_pat|xox[abprs]|sk|AKIA)[-_][A-Za-z0-9_-]{6,}/,
  /\b(password|passwd|secret|token|api[_-]?key)\s*[:=]/i,
  /\.env\b/,
];
const PLACEHOLDER = /^(tbd|todo|n\/?a|none|-|\?|unknown)?$/;

function norm(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toTime(value: unknown): number | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

function collectStrings(value: unknown, out: string[], depth = 0): void {
  if (depth > 6) return;
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out, depth + 1));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collectStrings(v, out, depth + 1));
}

function isActionList(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 1;
  if (typeof value !== "string") return false;
  const found = ACTIONS.filter((a) => new RegExp(`\\b${a}\\b`).test(norm(value)));
  return found.length > 1;
}

function hasAffirmative(q: string, action: ReleaseGateAction): boolean {
  if (/\bgo\b/.test(q)) return true;
  if (/\bapproved\b/.test(q)) return true;
  return new RegExp(`\\byes\\s*,?\\s*${action}\\b`).test(q);
}

function checkRollback(rollback: unknown, targetSha: string | null, reasons: string[]): void {
  if (!rollback || typeof rollback !== "object" || Array.isArray(rollback)) {
    reasons.push(isText(rollback) ? "rollback_placeholder" : "missing_rollback");
    return;
  }
  const r = rollback as ReleaseGateRollback;
  if (!(typeof r.priorSha === "string" && FULL_SHA.test(r.priorSha))) reasons.push("rollback_prior_sha_invalid");
  else if (targetSha !== null && r.priorSha === targetSha) reasons.push("rollback_prior_sha_equals_target");
  for (const key of ["trigger", "authorizer", "runner", "verify"] as const) {
    const v = r[key];
    if (!isText(v) || PLACEHOLDER.test(norm(v))) reasons.push(`rollback_missing_${key}`);
  }
  const steps = Array.isArray(r.steps) ? r.steps : [r.steps];
  if (steps.length === 0 || !steps.every((s) => isText(s) && !PLACEHOLDER.test(norm(s)))) {
    reasons.push("rollback_missing_steps");
  } else if (steps.some((s) => /\brm\b[^;&|]*\bdata\//.test(String(s)))) {
    reasons.push("rollback_deletes_data");
  }
  const d = r.dataImpact;
  if (!isText(d)) reasons.push("rollback_missing_data_impact");
  else {
    const n = norm(d);
    const m = /^(none|n\/?a)\b[\s:;,.\-\u2013\u2014]*(.*)$/.exec(n);
    if (m && m[2].replace(/[^a-z0-9]/g, "").length < 3) reasons.push("rollback_data_impact_no_reason");
    else if (/^(tbd|todo|\?|unknown)$/.test(n)) reasons.push("rollback_missing_data_impact");
  }
}

function evaluate(record: unknown, context: unknown): ReleaseGateResult {
  const fail: string[] = [];
  const ambiguous: string[] = [];
  const notGo: string[] = [];
  const done = (): ReleaseGateResult => {
    if (fail.length) return { status: "FAIL", reasons: fail, advisory: true };
    if (ambiguous.length) return { status: "AMBIGUOUS", reasons: [...ambiguous, ...notGo], advisory: true };
    if (notGo.length) return { status: "NOT_GO", reasons: notGo, advisory: true };
    return { status: "GO", reasons: ["all_rules_satisfied"], advisory: true };
  };

  if (!record || typeof record !== "object" || Array.isArray(record)) {
    fail.push("malformed_record");
    return done();
  }
  if (!context || typeof context !== "object" || Array.isArray(context)) {
    fail.push("malformed_context");
    return done();
  }
  const rec = record as ReleaseGateRecord;
  const ctx = context as ReleaseGateContext;
  const now = toTime(ctx.now);
  if (now === null) fail.push("context_missing_now");
  if (!Array.isArray(ctx.consumedApprovalIds)) fail.push("context_missing_consumed_ids");
  const cand = ctx.candidate as ReleaseGateCandidate | undefined;
  if (!cand || typeof cand !== "object" || !ACTIONS.includes(cand.action) || typeof cand.targetSha !== "string") {
    fail.push("context_missing_candidate");
  }

  const strings: string[] = [];
  collectStrings(rec, strings);
  if (strings.some((s) => UNSAFE.some((re) => re.test(s)))) fail.push("unsafe_input");

  if (!isText(rec.approvalId)) fail.push("missing_approval_id");
  if (!isText(rec.approver)) fail.push("missing_approver");
  if (!isText(rec.source)) fail.push("missing_source");
  const approvedAt = toTime(rec.approvedAt);
  const expiresAt = toTime(rec.expiresAt);
  if (approvedAt === null) fail.push("missing_approved_at");
  if (rec.expiresAt !== undefined && rec.expiresAt !== null && rec.expiresAt !== "" && expiresAt === null) {
    fail.push("invalid_expires_at");
  }

  // Action: exactly one.
  let action: ReleaseGateAction | null = null;
  if (isActionList(rec.action)) ambiguous.push("multiple_actions");
  else if (typeof rec.action === "string" && ACTIONS.includes(norm(rec.action) as ReleaseGateAction)) {
    action = norm(rec.action) as ReleaseGateAction;
  } else fail.push("missing_or_invalid_action");

  // Target SHA: full 40-hex only.
  let targetSha: string | null = null;
  if (typeof rec.targetSha === "string" && FULL_SHA.test(rec.targetSha.trim().toLowerCase())) {
    targetSha = rec.targetSha.trim().toLowerCase();
  } else if (typeof rec.targetSha === "string" && PREFIX_SHA.test(rec.targetSha.trim().toLowerCase())) {
    ambiguous.push("prefix_sha");
  } else if (!isText(rec.targetSha) && (isText(rec.branch) || isText(rec.host))) {
    ambiguous.push("branch_or_host_only_no_sha");
  } else fail.push("missing_or_invalid_target_sha");

  if (action === "deploy" && !isText(rec.host)) ambiguous.push("deploy_missing_host");
  if ((action === "push" || action === "merge") && !isText(rec.branch)) ambiguous.push("missing_branch");

  checkRollback(rec.rollback, targetSha, fail);
  if (fail.length) return done();

  // Approver and authorship (declared fields only; Reviewer attests authorship).
  if (rec.approver !== RELEASE_GATE_APPROVER) notGo.push("approver_not_gurth");
  if (rec.authorKind !== "owner_direct") notGo.push("not_owner_direct_text");

  // Quote classification.
  const q = isText(rec.quote) ? norm(rec.quote) : "";
  if (!q) notGo.push("no_approval_text");
  else {
    if (NEGATION.some((re) => re.test(q))) notGo.push("negated_approval");
    if (HEDGES.some((h) => q.includes(h))) notGo.push("hedged_approval");
    if (CONDITIONAL.test(q)) notGo.push("conditional_approval");
    if (BUNDLED.test(q)) notGo.push("bundled_approval");
    if (action && !hasAffirmative(q, action)) notGo.push("no_affirmative_token");
    if (action) {
      const named = ACTIONS.filter((a) => new RegExp(`\\b${a}\\b`).test(q));
      if (named.length > 0 && !named.includes(action)) notGo.push("quote_names_other_action");
    }
  }

  // Candidate binding.
  if (cand && action && action !== cand.action) notGo.push("action_mismatch");
  if (cand && targetSha && targetSha !== cand.targetSha.trim().toLowerCase()) notGo.push("sha_mismatch");
  if (cand && action === "deploy" && isText(rec.host) && rec.host !== cand.host) notGo.push("host_mismatch");
  if (cand && action !== "deploy" && isText(rec.branch) && rec.branch !== cand.branch) notGo.push("branch_mismatch");

  // Expiry.
  if (expiresAt === null) notGo.push("missing_expiry");
  else if (approvedAt !== null && expiresAt - approvedAt > RELEASE_GATE_MAX_TTL_MS) notGo.push("ttl_over_24h");
  if (expiresAt !== null && now !== null && now > expiresAt) notGo.push("expired");
  if (approvedAt !== null && now !== null && approvedAt > now) notGo.push("approved_in_future");
  const tip = cand ? toTime(cand.tipCommittedAt) : null;
  if (tip !== null && approvedAt !== null && approvedAt < tip) notGo.push("approval_older_than_tip");

  // Single use.
  if (Array.isArray(ctx.consumedApprovalIds) && ctx.consumedApprovalIds.includes(String(rec.approvalId))) {
    notGo.push("approval_replayed");
  }

  // Revocations: a later matching retraction overrides GO.
  if (Array.isArray(rec.revocations)) {
    for (const rv of rec.revocations as ReleaseGateRevocation[]) {
      if (!rv || typeof rv !== "object") continue;
      const at = toTime(rv.at);
      const shaOk = rv.targetSha === undefined || String(rv.targetSha).toLowerCase() === targetSha;
      const actOk = rv.action === undefined || norm(String(rv.action)) === action;
      if (shaOk && actOk && (at === null || approvedAt === null || at >= approvedAt)) {
        notGo.push("revoked");
        break;
      }
    }
  }

  return done();
}

/** Advisory, offline classification of a release gate record. Never throws. */
export function validateReleaseGateRecord(record: unknown, context: unknown): ReleaseGateResult {
  try {
    return evaluate(record, context);
  } catch {
    return { status: "FAIL", reasons: ["internal_error"], advisory: true };
  }
}

export function isReleaseGateGo(result: ReleaseGateResult): boolean {
  return result.status === "GO";
}
