# GitHub-Safe Release Check

- Phase: `KIA-Stick-github-safe-prepush-audit`
- Date: `2026-06-20`
- Target machine: `USER_LAPTOP_ONLY`
- Target repo: `/home/mint/kia-stick`
- GitHub repo: `https://github.com/GurthBro0ks/kia-stick`
- Proof directory: `/tmp/proof_kia_stick_github_safe_prepush_20260620T100801Z`
- Result: `PASS`
- Push performed: `no`

## Remote Check

`origin` was absent at the start of the audit and was added as:

```text
https://github.com/GurthBro0ks/kia-stick
```

No push was performed.

## Tracked File Safety

Tracked files were audited with `git ls-files`.

No tracked files were found under these private or release-forbidden paths:

- `DB/`
- `data/real-documents/`
- `data/quarantine/`
- `data/redacted-approved/`
- `exports/`
- `backups/`
- `vector-store/`

The broad `.env*` tracked-file query returned `.env.example` only. That file contains only the local fake deterministic provider setting and no key material. The privacy scan explicitly allows `.env.example` while rejecting real `.env*` files.

No tracked private-vault databases, OCR dumps, screenshots with real data, uploads, raw docs, proprietary binaries, captures, or secret-looking values were found.

## Fake-Doc Boundary

`npm run scan:fake` passed for 12 fake documents.

All tracked `content/fake-docs/*.md` files include the required fake-sample banner:

```text
FAKE SAMPLE DOCUMENT
```

README, CLOSEOUT, and AGENTS all warn that this repo is fake-doc-only and that real/private APWU, USPS, member, local, account, case, upload, export, backup, and vault data must stay outside GitHub-safe tracked content.

## Validation

The following checks passed:

- `git status --short`
- `git remote -v`
- `git ls-files`
- forbidden tracked path check
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run qa`
- `npm run scan:fake`
- `npm run scan:privacy`
- fake banner grep
- manual policy-term grep review

Known non-failing warnings:

- `npm run test` prints the existing Vite CJS API deprecation notice.
- `npm run build` prints the existing Next ESLint-plugin detection warning.

## Manual Grep Review

Policy-term grep output was reviewed manually.

Allowed hits were limited to:

- fake sample corpus text and fake source taxonomy labels
- source-governance code paths
- planning/policy documentation
- explicit private-boundary warnings for `/media/mint/SHARED/APWU`

No real APWU, USPS, member, local, account, case, medical, grievance, settlement, screenshot, OCR, upload, capture, token, or secret content was identified.

## Release Decision

This repo is GitHub-safe to link and push after this audit, subject to the standing rule that raw/private real-document material remains outside tracked content.

Recommended next command, after operator review:

```bash
git push -u origin main
```

## Gate record (GUR-106, advisory)

`lib/releaseGateRecord.ts` exports `validateReleaseGateRecord(record, context)`. It classifies a push, merge or deploy gate record as `GO`, `NOT_GO`, `AMBIGUOUS` or `FAIL` and returns reason codes.

- **Advisory and offline only.** It is not wired into `scripts/release-check.mjs`, `scripts/git_auto_sync.sh`, package scripts, CI, hooks or `qa_gate.sh`, and it enforces nothing. `KIA_ALLOW_PUSH` still governs `git_auto_sync.sh` on its own.
- **It checks declared fields only.** It cannot verify who wrote the quoted approval. The Reviewer re-classifies the quoted text against the cited source and attests that it is Gurth's own words. Relays, PM text, agent-app posts and agent text quoting Gurth are `NOT_GO`.
- **Pure and deterministic.** No file, process, network or environment access. The caller passes `now`, `consumedApprovalIds` and the candidate (`action`, full `targetSha`, `branch` or `host`, required `tipCommittedAt`; missing is `AMBIGUOUS`). No env var, `NODE_ENV`, flag or `KIA_ALLOW_PUSH` changes the result. It never throws: malformed input is `FAIL`.
- **Rules** (spec v3 §3–§4): one action per record; full 40-hex SHA (a prefix or branch-only target is `AMBIGUOUS`, and `AMBIGUOUS` is never `GO`); the quote must be a bare affirmative (`GO`, `approved` or `yes, <action>`, optionally followed only by the record's own action, SHA, branch or host); any `?`, `but`, `later`, `tomorrow`, negation (`don't`, `won't`, `no`, `no-go`) or `just kidding` is `NOT_GO`; hedged, conditional, bundled, negated or revoked approvals are `NOT_GO`; TTL at most 24 h, and expired or replayed approvals are `NOT_GO`; a complete rollback (`priorSha` different from `targetSha`, trigger, authorizer, runner, steps, verify, dataImpact) is required or the result is `FAIL`; destructive rollback steps (`rm -rf`, `rm` under `data/`, `git clean -fdx`, `reset --hard`, force push, `branch -D`, dropping tables) are `FAIL`. The Reviewer still checks steps by hand.
- The record template lives outside the repo at `galaxy-prep/kia-stick/decisions/GATE-RECORD-TEMPLATE.md`.
