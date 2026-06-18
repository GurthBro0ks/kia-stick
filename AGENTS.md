# Project Instructions — KIA Stick Fake-Docs Harness

## Scope

This repo is a laptop-only MVP for KIA Stick / Know-It-All Stick using **fake sample documents only**.

Allowed:
- Fake source hierarchy and citation-first answer governance.
- Local deterministic answer generation.
- Sanitized proof packs and project tooling.
- GitHub-safe source files.

Forbidden:
- Real APWU, USPS, member, local, account, or case documents.
- Reading, copying, indexing, or scanning `/media/mint/SHARED/APWU`; that mount is real-document storage and out of scope for this fake-doc MVP.
- Captures with session/account data.
- Tokens, cookies, auth headers, device IDs, API keys, or secrets.
- APK/XAPK, `.so`, `.luac`, raw captures, vector stores, uploads, private docs, exports, or backups.
- NUC, SSH, Discord, Caddy, DNS, cron, systemd, tmux, or cloud calls for this MVP.

## Agent Prompt Wrapper

Top:
```bash
cat ./AGENTS.md
cat ./claude-progress.md
source ./init.sh
```

Bottom:
```text
When done:
1. Update ./claude-progress.md with commands run, files changed, proof directory, and remaining unknowns.
2. Update ./feature_list.json if relevant.
3. Run ./scripts/qa_gate.sh and save the proof path.
4. Run ./scripts/git_auto_sync.sh only after QA passes.
5. Do not commit originals, captures, APK/XAPK, `.so`, `.luac`, secrets, or account/session data.
```
