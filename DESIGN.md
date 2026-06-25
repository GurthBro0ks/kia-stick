# KIA Stick Design Contract

Phase: `KIA-Stick-v0.7.6-design-md-fake-only-ux-contract`

Product version: `0.7.0`

Prompt version: `prompt.fake-docs.v0.5-import-wizard-hardening`

## Purpose

`DESIGN.md` is the repo-owned design and UX contract for KIA Stick. It preserves the accepted v0.7.5 UI direction: a restrained operational interface, citation-first hierarchy, dense but readable Sources/Vault/Import surfaces, explicit fake-only safety labels, and version identity that stays visible in runtime and proof surfaces.

This file is project knowledge only. It is not a source of approval for real-doc work, and it does not authorize implementation beyond the fake-only KIA Stick harness.

## Product Identity

KIA Stick is a laptop-only fake-doc PWA for testing citation-first answer governance, fake source hierarchy, local saved-answer metadata, fake Upload quarantine labels, fake Import Wizard state labels, and fake Vault review labels.

The current identity contract is:

- `productVersion`: `0.7.0`
- `displayVersion`: `productVersion-channel.buildDate+gitSha`
- `promptVersion`: `prompt.fake-docs.v0.5-import-wizard-hardening`
- `provider`: local fake deterministic provider
- Primary surfaces: Chat, Sources, Saved, Upload, Import, Vault, Settings, `/health`, and `/version`

## Fake-Only Boundary

Every UX decision must reinforce that the app uses bundled fake corpus data and synthetic metadata only.

Forbidden affordances:

- No file pickers, directory pickers, drag-and-drop import zones, file inputs, or file chooser copy.
- No path readers, pasted local paths, recursive directory scans, `readFile` document flows, streams, or filesystem document ingestion.
- No real uploads, upload handlers, object storage, quarantine copies, backups, or exports of private documents.
- No OCR, text extraction, summarization, transforms, real redaction, embeddings, indexing, or vector stores.
- No private-vault inspection, private note ingestion, APWU access, account/session data capture, or secret-handling flows.
- No UI copy that implies a real document can be selected, opened, processed, redacted, indexed, or approved.

## Visual Tone

The interface should read as a quiet operations tool, not a marketing site.

- Keep layouts compact, scannable, and audit-friendly.
- Lead with citations, source identity, eligibility, and safety state.
- Favor sober labels, counts, chips, and short status lines over decorative panels.
- Use restrained contrast and clear hierarchy so dense surfaces stay readable.
- Cards are for repeated records or framed tool rows, not page-level decoration.

## Scan-Density Rules

Chat:

- Preserve message-first workflow with clear user/assistant turns.
- Keep the no-answer path obvious and block saves when no citable answer exists.
- Keep citations, build identity, prompt identity, provider, mode, scope, and detail close to the answer.

Sources:

- Surface fake source IDs, hierarchy ranks, citable/context-only status, and version traceability.
- Make citation-to-source review faster than browsing prose.

Saved:

- Show saved-answer metadata with `productVersion`, `displayVersion`, `promptVersion`, provider, mode, scope, detail, and timestamp.
- Empty and duplicate states must be explicit and non-alarming.

Upload:

- Use fake metadata queue buttons only.
- The primary label must say fake sample or fake batch metadata, not real upload.
- Confirmation copy must say no file chooser opens and no bytes are read.

Import:

- Treat Import as a fake wizard scaffold.
- Show current step, next step, blocked action, and proof/export guard labels.
- Blocked transitions must sound deterministic, not advisory.

Vault:

- Show workflow state, redaction review label, metadata review label, index gate label, safety label, audit-export label, and next-step label near every record.
- Technical details can be collapsible, but plain-language safety and eligibility must stay visible.

Settings:

- Keep local fake MVP identity, version metadata, and privacy boundary copy aligned with runtime.
- Settings must not become an approval surface for real-doc work.

`/health` and `/version`:

- `/health` must expose the current phase and runtime version payload.
- `/version` must show `displayVersion`, `productVersion`, `promptVersion`, provider, corpus, index, build date, and git SHA.
- These routes are proof surfaces; keep them stable and easy to compare against saved-answer metadata.

## Safety-Label Language

Use consistent language across Upload, Import, Vault, proof/export, and no-answer paths:

- `fake metadata only`
- `synthetic metadata only`
- `metadata and guard flags only`
- `no file chooser opens`
- `no document bytes read`
- `not indexable`
- `blocked`
- `export blocked`
- `No Saved record is created for no-answer responses.`

Avoid labels that imply real capability:

- Do not say `Upload document`, `Open file`, `Import real file`, `Run OCR`, `Generate embeddings`, `Index vault`, or `Approve real redaction`.
- Do not use `ready for real pilot`, `approved`, or `production ingestion` on fake-only surfaces.

## Component And State Labels

- Use stable nouns for tabs: Chat, Sources, Saved, Upload, Vault, Import, Settings.
- Use explicit fake prefixes where a surface might otherwise imply a real workflow.
- Use PASS/WARN/FAIL only for proof, review, or validation artifacts where the gate is deterministic.
- Use `blocked` for forbidden real-doc actions and unsafe fake export states.
- Use `not indexable` for fake records that must not appear citable.
- Keep labels short enough for mobile chips and narrow cards without wrapping into ambiguous text.

## Empty, Loading, Error, And No-Answer States

- Empty states must state what is absent and whether the absence is expected.
- Loading states must not suggest real file scanning or ingestion.
- Error states must not ask the user to browse for real files or provide private paths.
- No-answer states must preserve citation integrity: no citable answer means no saved answer record and no best-guess promotion.

## Accessibility And Mobile

- Maintain keyboard-reachable controls with real button/link elements.
- Keep touch targets large enough for bottom navigation and action rows.
- Preserve visible focus states and semantic landmarks where practical.
- Avoid text overlap in chips, buttons, nav items, cards, and proof labels.
- Dense panels should wrap into readable stacks on mobile without hiding safety labels.

## Proof-Safe Output Expectations

Screenshots, proof exports, logs, and summaries must be GitHub-safe.

Allowed proof content:

- Sanitized command names, phase names, version strings, commit IDs, booleans, counts, fake IDs, fake source labels, guard flags, and PASS/WARN/FAIL labels.

Forbidden proof content:

- Real document text, real snippets, private paths, filenames from private storage, account/session data, device identifiers, secrets, captures, hashes from sensitive material, OCR output, embeddings, vector data, or private notes.

## Approval Boundary

This design contract does not approve real-doc work.

Any future real-doc path remains blocked until a separate operator-approved prompt satisfies the existing safety checklist, approval packet, redaction policy, one-gate/one-document rule, proof-safety requirements, and fresh operator approval.
